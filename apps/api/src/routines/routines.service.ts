import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type {
  createRoutineRequestSchema,
  Routine as RoutineDto,
  RoutineList,
  saveRoutineRequestSchema,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import type { Prisma, Routine, RoutineTemplate } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TemplatesService, type TemplateSummary } from '../templates/templates.service';
import { UsersService } from '../users/users.service';

type SaveRoutineInput = z.output<typeof saveRoutineRequestSchema>;
type CreateRoutineInput = z.output<typeof createRoutineRequestSchema>;
type RoutineWithTemplates = Routine & { templates: RoutineTemplate[] };

export interface ActiveRoutine {
  id: string;
  name: string;
  templates: { position: number; id: string; name: string }[];
}

const NOT_FOUND = 'Rutina no encontrada.';
const withTemplates = { templates: { orderBy: { position: 'asc' } } } as const;

/** `YYYY-MM-DD` ↔ columna DATE. Las fechas sin hora se tratan siempre en UTC. */
const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class RoutinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly templates: TemplatesService,
  ) {}

  /** Rutinas de un cliente: primero la activa y después las más recientes. */
  async listForClient(actor: AuthUser, clientId: string): Promise<RoutineList> {
    await this.users.getClient(actor, clientId);
    const routines = await this.prisma.routine.findMany({
      where: { centerId: actor.centerId, clientId },
      orderBy: [{ isActive: 'desc' }, { startsOn: 'desc' }, { createdAt: 'desc' }],
      include: withTemplates,
    });
    return { items: await this.toDtos(actor, routines) };
  }

  async get(actor: AuthUser, id: string): Promise<RoutineDto> {
    return (await this.toDtos(actor, [await this.findVisible(actor, id)]))[0] as RoutineDto;
  }

  /** AC-003-12 y AC-003-13. */
  async create(actor: AuthUser, clientId: string, input: CreateRoutineInput): Promise<RoutineDto> {
    await this.users.getClient(actor, clientId);
    await this.assertTemplatesExist(actor, input.templateIds);
    const routine = await this.prisma.$transaction(async (tx) => {
      if (input.activate) await deactivateOthers(tx, clientId);
      return tx.routine.create({
        data: {
          centerId: actor.centerId,
          clientId,
          ...routineFields(input),
          isActive: input.activate,
          templates: { create: templateRows(input.templateIds) },
        },
        include: withTemplates,
      });
    });
    return this.get(actor, routine.id);
  }

  async update(actor: AuthUser, id: string, input: SaveRoutineInput): Promise<RoutineDto> {
    await this.findVisible(actor, id);
    await this.assertTemplatesExist(actor, input.templateIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.routineTemplate.deleteMany({ where: { routineId: id } });
      await tx.routine.update({
        where: { id },
        data: { ...routineFields(input), templates: { create: templateRows(input.templateIds) } },
      });
    });
    return this.get(actor, id);
  }

  /** AC-003-13: al activar una rutina, la que estuviera activa para ese cliente pasa a inactiva. */
  async activate(actor: AuthUser, id: string): Promise<RoutineDto> {
    const routine = await this.findVisible(actor, id);
    await this.prisma.$transaction(async (tx) => {
      await deactivateOthers(tx, routine.clientId);
      await tx.routine.update({ where: { id }, data: { isActive: true } });
    });
    return this.get(actor, id);
  }

  async deactivate(actor: AuthUser, id: string): Promise<RoutineDto> {
    await this.findVisible(actor, id);
    await this.prisma.routine.update({ where: { id }, data: { isActive: false } });
    return this.get(actor, id);
  }

  /**
   * Rutina activa de un cliente con sus plantillas en orden, para proponer la siguiente al iniciar una
   * sesión (spec 004, AC-004-04). Null si no tiene ninguna activa.
   */
  async activeForClient(centerId: string, clientId: string): Promise<ActiveRoutine | null> {
    const routine = await this.prisma.routine.findFirst({
      where: { centerId, clientId, isActive: true },
      include: withTemplates,
    });
    if (!routine || routine.templates.length === 0) return null;
    const templates = await this.templates.summaries(
      centerId,
      routine.templates.map((item) => item.templateId),
    );
    return {
      id: routine.id,
      name: routine.name,
      templates: routine.templates.map((item) => ({
        position: item.position,
        id: item.templateId,
        name: templates.get(item.templateId)?.name ?? '',
      })),
    };
  }

  /** La rutina debe ser del centro y su cliente, visible para quien pregunta. */
  private async findVisible(actor: AuthUser, id: string): Promise<RoutineWithTemplates> {
    const routine = await this.prisma.routine.findFirst({
      where: { id, centerId: actor.centerId },
      include: withTemplates,
    });
    if (!routine) throw new NotFoundException(NOT_FOUND);
    await this.users.getClient(actor, routine.clientId);
    return routine;
  }

  private async assertTemplatesExist(actor: AuthUser, ids: string[]): Promise<void> {
    const templates = await this.templates.summaries(actor.centerId, ids);
    if (ids.some((id) => !templates.has(id))) {
      throw new UnprocessableEntityException('Alguna plantilla no existe.');
    }
  }

  private async toDtos(actor: AuthUser, routines: RoutineWithTemplates[]): Promise<RoutineDto[]> {
    const templates = await this.templates.summaries(
      actor.centerId,
      routines.flatMap((routine) => routine.templates.map((item) => item.templateId)),
    );
    return routines.map((routine) => ({
      id: routine.id,
      clientId: routine.clientId,
      name: routine.name,
      goal: routine.goal,
      startsOn: toDay(routine.startsOn),
      endsOn: routine.endsOn ? toDay(routine.endsOn) : null,
      isActive: routine.isActive,
      templates: routine.templates.map((item) => ({
        position: item.position,
        ...(templates.get(item.templateId) as TemplateSummary),
      })),
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
    }));
  }
}

function routineFields(input: SaveRoutineInput) {
  return {
    name: input.name,
    goal: input.goal ?? null,
    startsOn: toDate(input.startsOn),
    endsOn: input.endsOn ? toDate(input.endsOn) : null,
  };
}

function templateRows(templateIds: string[]) {
  return templateIds.map((templateId, position) => ({ templateId, position }));
}

function deactivateOthers(tx: Prisma.TransactionClient, clientId: string) {
  return tx.routine.updateMany({ where: { clientId, isActive: true }, data: { isActive: false } });
}
