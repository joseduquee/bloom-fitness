import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  listTemplatesQuerySchema,
  saveTemplateRequestSchema,
  TemplateExerciseSummary,
  WorkoutTemplate as WorkoutTemplateDto,
  WorkoutTemplateList,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { ExercisesService } from '../exercises/exercises.service';
import { Prisma, type TemplateExercise, type WorkoutTemplate } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SaveTemplateInput = z.output<typeof saveTemplateRequestSchema>;
type ListTemplatesInput = z.output<typeof listTemplatesQuerySchema>;
type TemplateWithItems = WorkoutTemplate & { items: TemplateExercise[] };

/** Datos de una plantilla que necesitan las rutinas. */
export interface TemplateSummary {
  id: string;
  name: string;
  exerciseCount: number;
}

const NOT_FOUND = 'Plantilla no encontrada.';
const COPY_SUFFIX = ' (copia)';
const NAME_MAX = 80;

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercises: ExercisesService,
  ) {}

  async list(actor: AuthUser, query: ListTemplatesInput): Promise<WorkoutTemplateList> {
    const where: Prisma.WorkoutTemplateWhereInput = {
      centerId: actor.centerId,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [total, templates] = await this.prisma.$transaction([
      this.prisma.workoutTemplate.count({ where }),
      this.prisma.workoutTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { items: true } } },
      }),
    ]);
    return {
      items: templates.map((template) => ({
        id: template.id,
        name: template.name,
        goal: template.goal,
        exerciseCount: template._count.items,
        updatedAt: template.updatedAt.toISOString(),
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(actor: AuthUser, id: string): Promise<WorkoutTemplateDto> {
    return this.toDto(actor, await this.findInCenter(actor, id));
  }

  /** AC-003-07 y AC-003-08. */
  async create(actor: AuthUser, input: SaveTemplateInput): Promise<WorkoutTemplateDto> {
    await this.assertExercisesUsable(actor, input, new Set());
    const template = await this.prisma.workoutTemplate.create({
      data: {
        centerId: actor.centerId,
        name: input.name,
        goal: input.goal ?? null,
        items: { create: toItemRows(input) },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return this.toDto(actor, template);
  }

  /** AC-003-09: la lista de ejercicios se sustituye entera, en el orden recibido. */
  async update(actor: AuthUser, id: string, input: SaveTemplateInput): Promise<WorkoutTemplateDto> {
    const current = await this.findInCenter(actor, id);
    await this.assertExercisesUsable(
      actor,
      input,
      new Set(current.items.map((item) => item.exerciseId)),
    );
    const template = await this.prisma.$transaction(async (tx) => {
      await tx.templateExercise.deleteMany({ where: { templateId: id } });
      return tx.workoutTemplate.update({
        where: { id },
        data: { name: input.name, goal: input.goal ?? null, items: { create: toItemRows(input) } },
        include: { items: { orderBy: { position: 'asc' } } },
      });
    });
    return this.toDto(actor, template);
  }

  /** AC-003-10. */
  async duplicate(actor: AuthUser, id: string): Promise<WorkoutTemplateDto> {
    const source = await this.findInCenter(actor, id);
    const name = `${source.name.slice(0, NAME_MAX - COPY_SUFFIX.length)}${COPY_SUFFIX}`;
    const template = await this.prisma.workoutTemplate.create({
      data: {
        centerId: actor.centerId,
        name,
        goal: source.goal,
        items: {
          create: source.items.map(
            ({ exerciseId, position, sets, reps, targetLoadKg, restSeconds, notes }) => ({
              exerciseId,
              position,
              sets,
              reps,
              targetLoadKg,
              restSeconds,
              notes,
            }),
          ),
        },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return this.toDto(actor, template);
  }

  /** Una plantilla usada en alguna rutina no se borra: la base de datos lo impide (409). */
  async remove(actor: AuthUser, id: string): Promise<void> {
    await this.findInCenter(actor, id);
    try {
      await this.prisma.workoutTemplate.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'La plantilla se usa en alguna rutina. Quítala de las rutinas antes de eliminarla.',
        );
      }
      throw error;
    }
  }

  /** Para las rutinas: comprueba que las plantillas existen en el centro y devuelve su resumen. */
  async summaries(centerId: string, ids: string[]): Promise<Map<string, TemplateSummary>> {
    const templates = await this.prisma.workoutTemplate.findMany({
      where: { centerId, id: { in: [...new Set(ids)] } },
      include: { _count: { select: { items: true } } },
    });
    return new Map(
      templates.map((template) => [
        template.id,
        { id: template.id, name: template.name, exerciseCount: template._count.items },
      ]),
    );
  }

  private async findInCenter(actor: AuthUser, id: string): Promise<TemplateWithItems> {
    const template = await this.prisma.workoutTemplate.findFirst({
      where: { id, centerId: actor.centerId },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    if (!template) throw new NotFoundException(NOT_FOUND);
    return template;
  }

  /**
   * Los ejercicios deben ser del centro. Uno desactivado solo se admite si la plantilla ya lo tenía:
   * así editar una plantilla antigua no obliga a quitarlo (AC-003-04).
   */
  private async assertExercisesUsable(
    actor: AuthUser,
    input: SaveTemplateInput,
    alreadyInTemplate: Set<string>,
  ): Promise<void> {
    const ids = input.items.map((item) => item.exerciseId);
    const exercises = await this.exercises.summaries(actor.centerId, ids);
    if (ids.some((exerciseId) => !exercises.has(exerciseId))) {
      throw new UnprocessableEntityException('Algún ejercicio no existe en el catálogo.');
    }
    const inactive = [...exercises.values()].filter(
      (exercise) => !exercise.isActive && !alreadyInTemplate.has(exercise.id),
    );
    if (inactive.length > 0) {
      throw new UnprocessableEntityException(
        `No se pueden añadir ejercicios desactivados: ${inactive.map((exercise) => exercise.name).join(', ')}.`,
      );
    }
  }

  private async toDto(actor: AuthUser, template: TemplateWithItems): Promise<WorkoutTemplateDto> {
    const exercises = await this.exercises.summaries(
      actor.centerId,
      template.items.map((item) => item.exerciseId),
    );
    return {
      id: template.id,
      name: template.name,
      goal: template.goal,
      items: template.items.map((item) => ({
        position: item.position,
        exercise: exercises.get(item.exerciseId) as TemplateExerciseSummary,
        sets: item.sets,
        reps: item.reps,
        targetLoadKg: item.targetLoadKg === null ? null : item.targetLoadKg.toNumber(),
        restSeconds: item.restSeconds,
        notes: item.notes,
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}

function toItemRows(input: SaveTemplateInput) {
  return input.items.map((item, position) => ({
    exerciseId: item.exerciseId,
    position,
    sets: item.sets,
    reps: item.reps,
    targetLoadKg: item.targetLoadKg ?? null,
    restSeconds: item.restSeconds,
    notes: item.notes ?? null,
  }));
}
