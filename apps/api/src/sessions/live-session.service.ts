import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  liveExerciseStatus,
  nextRoutinePosition,
  Role,
  routineDayLabel,
  toScreenSession,
  type adjustExerciseRequestSchema,
  type LiveSession,
  type logSetRequestSchema,
  type navigateRequestSchema,
  type ScreenSession,
  type SessionPerson,
  type setAttendanceRequestSchema,
  type StartPlan,
  type startSessionRequestSchema,
  type TemplateExerciseSummary,
} from '@bloom/shared';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth-user';
import { ExercisesService } from '../exercises/exercises.service';
import type {
  Prisma,
  SessionAttendee,
  SessionExercise,
  SetLog,
  TrainingSession,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LiveEventsService } from './live-events.service';
import { RoutinesService, type ActiveRoutine } from '../routines/routines.service';
import { TemplatesService } from '../templates/templates.service';
import { UsersService } from '../users/users.service';

type StartInput = z.output<typeof startSessionRequestSchema>;
type AttendanceInput = z.output<typeof setAttendanceRequestSchema>;
type NavigateInput = z.output<typeof navigateRequestSchema>;
type LogSetInput = z.output<typeof logSetRequestSchema>;
type AdjustInput = z.output<typeof adjustExerciseRequestSchema>;

type ExerciseWithLogs = SessionExercise & { logs: SetLog[] };
type AttendeeWithExercises = SessionAttendee & { exercises: ExerciseWithLogs[] };
type FullSession = TrainingSession & { attendees: AttendeeWithExercises[] };
type Tx = Prisma.TransactionClient;

const fullInclude = {
  attendees: {
    include: {
      exercises: {
        orderBy: { position: 'asc' },
        include: { logs: { orderBy: { setNumber: 'asc' } } },
      },
    },
  },
} as const;

const NOT_FOUND = 'Sesión no encontrada.';

/**
 * Dirigir una sesión (spec 004, PR B). Cada acción devuelve la instantánea completa,
 * que en la PR C también se difunde a las pantallas.
 */
@Injectable()
export class LiveSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly routines: RoutinesService,
    private readonly templates: TemplatesService,
    private readonly exercises: ExercisesService,
    private readonly events: LiveEventsService,
  ) {}

  async snapshot(actor: AuthUser, id: string): Promise<LiveSession> {
    return this.toSnapshot(actor.centerId, await this.load(actor.centerId, id));
  }

  /** Sesiones en curso del centro vistas por una pantalla de sala (spec 005, AC-005-06). */
  async screenSessions(centerId: string): Promise<ScreenSession[]> {
    const sessions = await this.prisma.trainingSession.findMany({
      where: { centerId, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'asc' },
      include: fullInclude,
    });
    return Promise.all(
      sessions.map(async (session) => toScreenSession(await this.toSnapshot(centerId, session))),
    );
  }

  /** AC-004-04 y AC-003-14: plantilla que toca a cada asistente según su rutina activa. */
  async startPlan(actor: AuthUser, id: string): Promise<StartPlan> {
    const session = await this.load(actor.centerId, id);
    const people = await this.users.people(
      actor.centerId,
      session.attendees.map((a) => a.clientId),
    );
    const attendees = await Promise.all(
      session.attendees.map(async (attendee) => {
        const routine = await this.routines.activeForClient(actor.centerId, attendee.clientId);
        const proposedPosition = routine
          ? await this.nextPosition(attendee.clientId, routine)
          : null;
        return {
          client: people.get(attendee.clientId) as SessionPerson,
          routine,
          proposedTemplateId:
            routine && proposedPosition !== null
              ? (routine.templates[proposedPosition]?.id ?? null)
              : null,
          proposedPosition,
        };
      }),
    );
    return { attendees: attendees.sort((a, b) => byName(a.client, b.client)) };
  }

  /** AC-004-04 y AC-004-05: inicia la sesión copiando la plantilla de cada asistente. */
  async start(actor: AuthUser, id: string, input: StartInput): Promise<LiveSession> {
    const session = await this.load(actor.centerId, id);
    this.assertCanManage(actor, session);
    if (session.status !== 'SCHEDULED') {
      throw new ConflictException('La sesión ya se ha iniciado o no se puede iniciar.');
    }
    const plan = await this.startPlan(actor, id);
    const chosen = new Map(input.assignments.map((a) => [a.clientId, a.templateId]));
    if (
      [...chosen.keys()].some((clientId) => !plan.attendees.some((a) => a.client.id === clientId))
    ) {
      throw new UnprocessableEntityException('Alguno de los clientes no está en la sesión.');
    }

    // Se resuelven y copian todas las plantillas antes de escribir nada.
    const assignments = await Promise.all(
      plan.attendees.map(async (proposal) => {
        const templateId = chosen.has(proposal.client.id)
          ? (chosen.get(proposal.client.id) ?? null)
          : proposal.proposedTemplateId;
        if (!templateId) return { clientId: proposal.client.id, copy: null, routine: null };
        const copy = await this.templates.forCopy(actor.centerId, templateId);
        const position =
          templateId === proposal.proposedTemplateId
            ? proposal.proposedPosition
            : (proposal.routine?.templates.find((t) => t.id === templateId)?.position ?? null);
        const routine =
          proposal.routine && position !== null
            ? { id: proposal.routine.id, name: proposal.routine.name, position }
            : null;
        return { clientId: proposal.client.id, copy, routine };
      }),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const { clientId, copy, routine } of assignments) {
        const attendee = session.attendees.find((a) => a.clientId === clientId);
        if (!attendee || !copy) continue;
        await tx.sessionAttendee.update({
          where: { id: attendee.id },
          data: {
            templateId: copy.id,
            templateName: copy.name,
            routineId: routine?.id ?? null,
            routineName: routine?.name ?? null,
            routinePosition: routine?.position ?? null,
            currentIndex: 0,
            exercises: { create: copy.items },
          },
        });
      }
      await tx.trainingSession.update({
        where: { id },
        data: { status: 'IN_PROGRESS', startedAt: new Date(), revision: { increment: 1 } },
      });
    });
    return this.publish(actor, id);
  }

  /** AC-004-04: cambia la plantilla de un asistente durante la sesión si aún no tiene series. */
  async changeTemplate(
    actor: AuthUser,
    id: string,
    clientId: string,
    templateId: string,
  ): Promise<LiveSession> {
    const { attendee } = await this.loadForChange(actor, id, clientId);
    if (attendee.exercises.some((exercise) => exercise.logs.length > 0)) {
      throw new ConflictException(
        'Ya hay series registradas: cambia o sustituye los ejercicios uno a uno.',
      );
    }
    const copy = await this.templates.forCopy(actor.centerId, templateId);
    const routine = await this.routines.activeForClient(actor.centerId, clientId);
    const position = routine?.templates.find((t) => t.id === templateId)?.position ?? null;
    await this.change(id, async (tx) => {
      await tx.sessionExercise.deleteMany({ where: { attendeeId: attendee.id } });
      await tx.sessionAttendee.update({
        where: { id: attendee.id },
        data: {
          templateId: copy.id,
          templateName: copy.name,
          routineId: routine && position !== null ? routine.id : null,
          routineName: routine && position !== null ? routine.name : null,
          routinePosition: position,
          currentIndex: 0,
          exercises: { create: copy.items },
        },
      });
    });
    return this.publish(actor, id);
  }

  /** AC-004-06. */
  async setAttendance(
    actor: AuthUser,
    id: string,
    clientId: string,
    input: AttendanceInput,
  ): Promise<LiveSession> {
    const { attendee } = await this.loadForChange(actor, id, clientId);
    await this.change(id, (tx) =>
      tx.sessionAttendee.update({
        where: { id: attendee.id },
        data: { attendance: input.attendance },
      }),
    );
    return this.publish(actor, id);
  }

  /** AC-004-07: avanzar, volver u omitir el ejercicio en curso. */
  async navigate(
    actor: AuthUser,
    id: string,
    clientId: string,
    input: NavigateInput,
  ): Promise<LiveSession> {
    const { attendee } = await this.loadForChange(actor, id, clientId, { training: true });
    const last = attendee.exercises.length - 1;
    const current = attendee.exercises[attendee.currentIndex];
    await this.change(id, async (tx) => {
      if (input.action === 'skip' && current) {
        await tx.sessionExercise.update({
          where: { id: current.id },
          data: { skippedAt: new Date() },
        });
      }
      const delta = input.action === 'previous' ? -1 : 1;
      const currentIndex = Math.min(Math.max(attendee.currentIndex + delta, 0), last);
      await tx.sessionAttendee.update({ where: { id: attendee.id }, data: { currentIndex } });
    });
    return this.publish(actor, id);
  }

  /** AC-004-11 y AC-004-12: guarda la serie; si ya existía, la corrige. */
  async logSet(
    actor: AuthUser,
    id: string,
    clientId: string,
    position: number,
    setNumber: number,
    input: LogSetInput,
  ): Promise<LiveSession> {
    const { attendee } = await this.loadForChange(actor, id, clientId, { training: true });
    const exercise = this.exerciseAt(attendee, position);
    if (setNumber < 1 || setNumber > exercise.sets) {
      throw new UnprocessableEntityException(
        `Este ejercicio tiene ${exercise.sets} series: elige una entre 1 y ${exercise.sets}.`,
      );
    }
    const data = { weightKg: input.weightKg, reps: input.reps, rpe: input.rpe ?? null };
    await this.change(id, async (tx) => {
      await tx.setLog.upsert({
        where: { sessionExerciseId_setNumber: { sessionExerciseId: exercise.id, setNumber } },
        create: { sessionExerciseId: exercise.id, setNumber, ...data },
        update: { ...data, loggedAt: new Date() },
      });
      // Registrar una serie en un ejercicio omitido significa que al final sí se ha hecho.
      if (exercise.skippedAt) {
        await tx.sessionExercise.update({ where: { id: exercise.id }, data: { skippedAt: null } });
      }
    });
    return this.publish(actor, id);
  }

  /** AC-004-14: cambia la carga objetivo o sustituye el ejercicio solo en esta sesión. */
  async adjustExercise(
    actor: AuthUser,
    id: string,
    clientId: string,
    position: number,
    input: AdjustInput,
  ): Promise<LiveSession> {
    const { attendee } = await this.loadForChange(actor, id, clientId);
    const exercise = this.exerciseAt(attendee, position);
    const data: Prisma.SessionExerciseUpdateInput = {};
    if (input.targetLoadKg !== undefined) data.targetLoadKg = input.targetLoadKg;
    if (input.exerciseId !== undefined && input.exerciseId !== exercise.exerciseId) {
      if (exercise.logs.length > 0) {
        throw new ConflictException(
          'Este ejercicio ya tiene series registradas y no se puede sustituir.',
        );
      }
      const replacement = (await this.exercises.summaries(actor.centerId, [input.exerciseId])).get(
        input.exerciseId,
      );
      if (!replacement?.isActive) {
        throw new UnprocessableEntityException(
          'El ejercicio elegido no existe o está desactivado.',
        );
      }
      data.exercise = { connect: { id: input.exerciseId } };
      data.originalExerciseId = exercise.originalExerciseId ?? exercise.exerciseId;
    }
    await this.change(id, (tx) => tx.sessionExercise.update({ where: { id: exercise.id }, data }));
    return this.publish(actor, id);
  }

  /** AC-004-08: la sesión termina y sus series quedan en el histórico. */
  async finish(actor: AuthUser, id: string): Promise<LiveSession> {
    await this.loadInProgress(actor, id);
    await this.change(id, (tx) =>
      tx.trainingSession.update({
        where: { id },
        data: { status: 'FINISHED', finishedAt: new Date() },
      }),
    );
    return this.publish(actor, id);
  }

  /** AC-004-15: tras cada cambio se difunde la instantánea a quien esté suscrito. */
  private async publish(actor: AuthUser, id: string): Promise<LiveSession> {
    const snapshot = await this.snapshot(actor, id);
    this.events.publish(actor.centerId, snapshot);
    return snapshot;
  }

  /** Posición que toca según la última sesión terminada del cliente con esta rutina. */
  private async nextPosition(clientId: string, routine: ActiveRoutine): Promise<number> {
    const last = await this.prisma.sessionAttendee.findFirst({
      where: {
        clientId,
        routineId: routine.id,
        attendance: 'PRESENT',
        routinePosition: { not: null },
        session: { status: 'FINISHED' },
      },
      orderBy: { session: { startedAt: 'desc' } },
      select: { routinePosition: true },
    });
    return nextRoutinePosition(routine.templates.length, last?.routinePosition ?? null);
  }

  /** Aplica el cambio y aumenta la revisión de la sesión en la misma transacción. */
  private async change(id: string, apply: (tx: Tx) => Promise<unknown>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await apply(tx);
      await tx.trainingSession.update({ where: { id }, data: { revision: { increment: 1 } } });
    });
  }

  private async load(centerId: string, id: string): Promise<FullSession> {
    const session = await this.prisma.trainingSession.findFirst({
      where: { id, centerId },
      include: fullInclude,
    });
    if (!session) throw new NotFoundException(NOT_FOUND);
    return session;
  }

  private async loadInProgress(actor: AuthUser, id: string): Promise<FullSession> {
    const session = await this.load(actor.centerId, id);
    this.assertCanManage(actor, session);
    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException('La sesión no está en curso.');
    }
    return session;
  }

  private async loadForChange(
    actor: AuthUser,
    id: string,
    clientId: string,
    options: { training?: boolean } = {},
  ): Promise<{ session: FullSession; attendee: AttendeeWithExercises }> {
    const session = await this.loadInProgress(actor, id);
    const attendee = session.attendees.find((a) => a.clientId === clientId);
    if (!attendee) throw new NotFoundException('El cliente no está en esta sesión.');
    if (options.training) {
      if (attendee.attendance === 'ABSENT') {
        throw new ConflictException('El asistente está marcado como ausente.');
      }
      if (attendee.exercises.length === 0) {
        throw new ConflictException('El asistente no tiene ninguna plantilla asignada.');
      }
    }
    return { session, attendee };
  }

  private exerciseAt(attendee: AttendeeWithExercises, position: number): ExerciseWithLogs {
    const exercise = attendee.exercises.find((item) => item.position === position);
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado en esta sesión.');
    return exercise;
  }

  /** AC-004-09: solo el entrenador asignado o un administrador dirige la sesión. */
  private assertCanManage(actor: AuthUser, session: TrainingSession): void {
    if (actor.role !== Role.ADMIN && session.trainerId !== actor.id) {
      throw new ForbiddenException(
        'Solo el entrenador asignado o un administrador puede modificar la sesión.',
      );
    }
  }

  private async toSnapshot(centerId: string, session: FullSession): Promise<LiveSession> {
    const people = await this.users.people(centerId, [
      session.trainerId,
      ...session.attendees.map((a) => a.clientId),
    ]);
    const exercises = await this.exercises.summaries(
      centerId,
      session.attendees.flatMap((a) => a.exercises.map((e) => e.exerciseId)),
    );
    return {
      id: session.id,
      status: session.status,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      startedAt: session.startedAt?.toISOString() ?? null,
      finishedAt: session.finishedAt?.toISOString() ?? null,
      trainer: people.get(session.trainerId) as SessionPerson,
      revision: session.revision,
      attendees: session.attendees
        .map((attendee) => ({
          client: people.get(attendee.clientId) as SessionPerson,
          attendance: attendee.attendance,
          routine:
            attendee.routineId && attendee.routineName && attendee.routinePosition !== null
              ? {
                  id: attendee.routineId,
                  name: attendee.routineName,
                  day: routineDayLabel(attendee.routinePosition),
                }
              : null,
          template:
            attendee.templateId && attendee.templateName
              ? { id: attendee.templateId, name: attendee.templateName }
              : null,
          currentIndex: attendee.currentIndex,
          exercises: attendee.exercises.map((exercise) => ({
            position: exercise.position,
            exercise: exercises.get(exercise.exerciseId) as TemplateExerciseSummary,
            originalExerciseId: exercise.originalExerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            targetLoadKg: exercise.targetLoadKg?.toNumber() ?? null,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes,
            status: liveExerciseStatus(exercise.sets, exercise.logs.length, !!exercise.skippedAt),
            logs: exercise.logs.map((log) => ({
              setNumber: log.setNumber,
              weightKg: log.weightKg.toNumber(),
              reps: log.reps,
              rpe: log.rpe,
            })),
          })),
        }))
        .sort((a, b) => byName(a.client, b.client)),
    };
  }
}

function byName(a: SessionPerson, b: SessionPerson): number {
  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es');
}
