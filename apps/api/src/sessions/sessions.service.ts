import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Role,
  type listSessionsQuerySchema,
  type saveSessionRequestSchema,
  type SessionList,
  type SessionPerson,
  type TrainingSession as TrainingSessionDto,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import type { Env } from '../config/env';
import type { SessionAttendee, TrainingSession } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type SaveSessionInput = z.output<typeof saveSessionRequestSchema>;
type ListSessionsInput = z.output<typeof listSessionsQuerySchema>;
type SessionWithAttendees = TrainingSession & { attendees: SessionAttendee[] };

const NOT_FOUND = 'Sesión no encontrada.';
const withAttendees = { attendees: true } as const;

@Injectable()
export class SessionsService {
  private readonly maxAttendees: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    config: ConfigService<Env, true>,
  ) {
    this.maxAttendees = config.get('SESSION_MAX_ATTENDEES', { infer: true });
  }

  /** AC-004-03: sesiones del centro que empiezan en el intervalo, en orden. */
  async list(actor: AuthUser, query: ListSessionsInput): Promise<SessionList> {
    const sessions = await this.prisma.trainingSession.findMany({
      where: {
        centerId: actor.centerId,
        startsAt: { gte: new Date(query.from), lt: new Date(query.to) },
      },
      orderBy: [{ startsAt: 'asc' }, { createdAt: 'asc' }],
      include: withAttendees,
    });
    return { items: await this.toDtos(actor, sessions), maxAttendees: this.maxAttendees };
  }

  async get(actor: AuthUser, id: string): Promise<TrainingSessionDto> {
    return this.toDto(actor, await this.findInCenter(actor, id));
  }

  /** AC-004-01 y AC-004-02. */
  async create(actor: AuthUser, input: SaveSessionInput): Promise<TrainingSessionDto> {
    const trainerId = this.resolveTrainer(actor, input.trainerId, actor.id);
    await this.validate(actor, input, trainerId);
    const session = await this.prisma.trainingSession.create({
      data: {
        centerId: actor.centerId,
        trainerId,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        notes: input.notes ?? null,
        attendees: { create: input.clientIds.map((clientId) => ({ clientId })) },
      },
      include: withAttendees,
    });
    return this.toDto(actor, session);
  }

  async update(actor: AuthUser, id: string, input: SaveSessionInput): Promise<TrainingSessionDto> {
    const current = await this.findInCenter(actor, id);
    this.assertCanManage(actor, current);
    this.assertScheduled(current);
    const trainerId = this.resolveTrainer(actor, input.trainerId, current.trainerId);
    await this.validate(actor, input, trainerId, id);
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.sessionAttendee.deleteMany({ where: { sessionId: id } });
      return tx.trainingSession.update({
        where: { id },
        data: {
          trainerId,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          notes: input.notes ?? null,
          attendees: { create: input.clientIds.map((clientId) => ({ clientId })) },
        },
        include: withAttendees,
      });
    });
    return this.toDto(actor, session);
  }

  async cancel(actor: AuthUser, id: string): Promise<TrainingSessionDto> {
    const current = await this.findInCenter(actor, id);
    this.assertCanManage(actor, current);
    this.assertScheduled(current);
    const session = await this.prisma.trainingSession.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: withAttendees,
    });
    return this.toDto(actor, session);
  }

  private async findInCenter(actor: AuthUser, id: string): Promise<SessionWithAttendees> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id, centerId: actor.centerId },
      include: withAttendees,
    });
    if (!session) throw new NotFoundException(NOT_FOUND);
    return session;
  }

  /** AC-004-09: solo el entrenador asignado o un administrador modifica la sesión. */
  private assertCanManage(actor: AuthUser, session: TrainingSession): void {
    if (actor.role !== Role.ADMIN && session.trainerId !== actor.id) {
      throw new ForbiddenException(
        'Solo el entrenador asignado o un administrador puede modificar la sesión.',
      );
    }
  }

  private assertScheduled(session: TrainingSession): void {
    if (session.status !== 'SCHEDULED') {
      throw new ConflictException('Solo se puede modificar una sesión que todavía no ha empezado.');
    }
  }

  /** Un entrenador solo programa sesiones para sí mismo; el administrador, para cualquiera. */
  private resolveTrainer(actor: AuthUser, requested: string | undefined, fallback: string): string {
    if (actor.role === Role.ADMIN) return requested ?? fallback;
    if (requested !== undefined && requested !== actor.id) {
      throw new ForbiddenException(
        'Solo un administrador puede asignar la sesión a otro entrenador.',
      );
    }
    return actor.id;
  }

  private async validate(
    actor: AuthUser,
    input: SaveSessionInput,
    trainerId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    if (input.clientIds.length > this.maxAttendees) {
      throw new UnprocessableEntityException(
        `La sesión admite como máximo ${this.maxAttendees} asistentes.`,
      );
    }
    await this.users.assertTrainer(actor.centerId, trainerId);
    await this.users.assertActiveClients(actor.centerId, input.clientIds);
    await this.assertNoOverlap(actor, input, exceptSessionId);
  }

  /**
   * AC-004-02: un cliente no puede estar en dos sesiones no canceladas que se cruzan.
   * Dos intervalos se solapan si cada uno empieza antes de que acabe el otro.
   */
  private async assertNoOverlap(
    actor: AuthUser,
    input: SaveSessionInput,
    exceptSessionId?: string,
  ): Promise<void> {
    const conflicts = await this.prisma.sessionAttendee.findMany({
      where: {
        clientId: { in: input.clientIds },
        session: {
          centerId: actor.centerId,
          status: { not: 'CANCELLED' },
          startsAt: { lt: new Date(input.endsAt) },
          endsAt: { gt: new Date(input.startsAt) },
          ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        },
      },
      select: { clientId: true },
    });
    if (conflicts.length === 0) return;

    const people = await this.users.people(
      actor.centerId,
      conflicts.map((conflict) => conflict.clientId),
    );
    const names = [...people.values()].map(displayName).sort();
    throw new ConflictException(
      `${names.join(', ')} ${names.length === 1 ? 'ya tiene' : 'ya tienen'} otra sesión en ese horario.`,
    );
  }

  private async toDto(actor: AuthUser, session: SessionWithAttendees): Promise<TrainingSessionDto> {
    return (await this.toDtos(actor, [session]))[0] as TrainingSessionDto;
  }

  private async toDtos(
    actor: AuthUser,
    sessions: SessionWithAttendees[],
  ): Promise<TrainingSessionDto[]> {
    const people = await this.users.people(
      actor.centerId,
      sessions.flatMap((session) => [
        session.trainerId,
        ...session.attendees.map((attendee) => attendee.clientId),
      ]),
    );
    const person = (id: string) => people.get(id) as SessionPerson;
    return sessions.map((session) => ({
      id: session.id,
      trainer: person(session.trainerId),
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      status: session.status,
      notes: session.notes,
      attendees: session.attendees
        .map((attendee) => person(attendee.clientId))
        .sort((a, b) => displayName(a).localeCompare(displayName(b), 'es')),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }));
  }
}

function displayName(person: SessionPerson): string {
  return `${person.firstName} ${person.lastName}`;
}
