import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  EXERCISE_MEDIA_TYPE,
  type Exercise as ExerciseDto,
  type ExerciseList,
  type createExerciseRequestSchema,
  type listExercisesQuerySchema,
  type updateExerciseRequestSchema,
} from '@bloom/shared';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { Prisma, type Exercise } from '../generated/prisma/client';
import { MEDIA_STORAGE, type MediaStorage } from '../media/media-storage';
import { PrismaService } from '../prisma/prisma.service';
import { isGif } from './gif';
import type { UploadedGif } from './gif-upload.interceptor';

type CreateExerciseInput = z.output<typeof createExerciseRequestSchema>;
type UpdateExerciseInput = z.output<typeof updateExerciseRequestSchema>;
type ListExercisesInput = z.output<typeof listExercisesQuerySchema>;

const NAME_TAKEN = 'Ya existe un ejercicio con ese nombre.';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
  ) {}

  /** AC-003-05: búsqueda por nombre y filtros por músculo y equipamiento. */
  async list(actor: AuthUser, query: ListExercisesInput): Promise<ExerciseList> {
    const where: Prisma.ExerciseWhereInput = {
      centerId: actor.centerId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.muscle ? { primaryMuscle: query.muscle } : {}),
      ...(query.equipment ? { equipment: query.equipment } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [total, exercises] = await this.prisma.$transaction([
      this.prisma.exercise.count({ where }),
      this.prisma.exercise.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: exercises.map((exercise) => this.toDto(exercise)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(actor: AuthUser, id: string): Promise<ExerciseDto> {
    return this.toDto(await this.findInCenter(actor, id));
  }

  /** AC-003-01 y AC-003-03. */
  async create(actor: AuthUser, input: CreateExerciseInput): Promise<ExerciseDto> {
    await this.assertNameAvailable(actor.centerId, input.name);
    const exercise = await this.withUniqueName(() =>
      this.prisma.exercise.create({
        data: {
          centerId: actor.centerId,
          name: input.name,
          primaryMuscle: input.primaryMuscle,
          equipment: input.equipment,
          difficulty: input.difficulty,
          instructions: input.instructions ?? null,
        },
      }),
    );
    return this.toDto(exercise);
  }

  async update(actor: AuthUser, id: string, input: UpdateExerciseInput): Promise<ExerciseDto> {
    await this.findInCenter(actor, id);
    if (input.name !== undefined) await this.assertNameAvailable(actor.centerId, input.name, id);
    const exercise = await this.withUniqueName(() =>
      this.prisma.exercise.update({ where: { id }, data: input }),
    );
    return this.toDto(exercise);
  }

  /** AC-003-04: se oculta del catálogo, pero no se borra. */
  async setActive(actor: AuthUser, id: string, isActive: boolean): Promise<ExerciseDto> {
    await this.findInCenter(actor, id);
    return this.toDto(await this.prisma.exercise.update({ where: { id }, data: { isActive } }));
  }

  /** AC-003-02: guarda el GIF en el almacenamiento y borra el anterior. */
  async setMedia(actor: AuthUser, id: string, file: UploadedGif | undefined): Promise<ExerciseDto> {
    const exercise = await this.findInCenter(actor, id);
    if (!file || file.size === 0) {
      throw new BadRequestException('Adjunta un archivo GIF en el campo «file».');
    }
    if (!isGif(file.buffer)) {
      throw new UnsupportedMediaTypeException('El archivo debe ser un GIF.');
    }

    const key = `exercises/${randomUUID()}.gif`;
    await this.storage.put(key, file.buffer, EXERCISE_MEDIA_TYPE);
    const updated = await this.prisma.exercise.update({ where: { id }, data: { mediaKey: key } });
    if (exercise.mediaKey) await this.storage.delete(exercise.mediaKey);
    return this.toDto(updated);
  }

  async removeMedia(actor: AuthUser, id: string): Promise<ExerciseDto> {
    const exercise = await this.findInCenter(actor, id);
    const updated = await this.prisma.exercise.update({ where: { id }, data: { mediaKey: null } });
    if (exercise.mediaKey) await this.storage.delete(exercise.mediaKey);
    return this.toDto(updated);
  }

  private async findInCenter(actor: AuthUser, id: string): Promise<Exercise> {
    const exercise = await this.prisma.exercise.findFirst({
      where: { id, centerId: actor.centerId },
    });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado.');
    return exercise;
  }

  /** AC-003-03: el nombre es único en el centro sin distinguir mayúsculas. */
  private async assertNameAvailable(centerId: string, name: string, exceptId?: string) {
    const existing = await this.prisma.exercise.findFirst({
      where: {
        centerId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException(NAME_TAKEN);
  }

  /** Respaldo de la base de datos si dos altas con el mismo nombre llegan a la vez. */
  private async withUniqueName<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(NAME_TAKEN);
      }
      throw error;
    }
  }

  private toDto(exercise: Exercise): ExerciseDto {
    return {
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      instructions: exercise.instructions,
      mediaUrl: exercise.mediaKey ? this.storage.publicUrl(exercise.mediaKey) : null,
      isActive: exercise.isActive,
      createdAt: exercise.createdAt.toISOString(),
      updatedAt: exercise.updatedAt.toISOString(),
    };
  }
}
