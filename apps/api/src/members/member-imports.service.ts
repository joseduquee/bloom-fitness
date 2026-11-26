import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  membersProviderLabels,
  Role,
  type ImportError,
  type MemberImport as MemberImportDto,
  type MemberImportList,
} from '@bloom/shared';
import type { AuthUser } from '../auth/auth-user';
import type { MemberImport, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { planImport, type ImportPlan } from './import-plan';
import { MEMBERS_PROVIDER, MembersProviderError, type MembersProvider } from './members-provider';

/** Errores que se guardan por ejecución. El total se cuenta igualmente en `errorCount`. */
const MAX_STORED_ERRORS = 100;
const HISTORY_SIZE = 10;

type MemberImportWithActor = MemberImport & {
  triggeredBy: { firstName: string; lastName: string } | null;
};

@Injectable()
export class MemberImportsService {
  private readonly logger = new Logger(MemberImportsService.name);
  /** Centros con una importación en curso. En memoria: válido para una sola instancia del API. */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MEMBERS_PROVIDER) private readonly provider: MembersProvider,
  ) {}

  async list(actor: AuthUser): Promise<MemberImportList> {
    const runs = await this.prisma.memberImport.findMany({
      where: { centerId: actor.centerId },
      orderBy: { startedAt: 'desc' },
      take: HISTORY_SIZE,
      include: { triggeredBy: { select: { firstName: true, lastName: true } } },
    });
    return {
      provider: { id: this.provider.source, label: membersProviderLabels[this.provider.source] },
      items: runs.map(toMemberImportDto),
    };
  }

  /** AC-002-01 a AC-002-05. */
  async run(actor: AuthUser): Promise<MemberImportDto> {
    if (this.running.has(actor.centerId)) {
      throw new ConflictException('Ya hay una importación en curso. Espera a que termine.');
    }
    this.running.add(actor.centerId);
    try {
      return await this.execute(actor);
    } finally {
      this.running.delete(actor.centerId);
    }
  }

  private async execute(actor: AuthUser): Promise<MemberImportDto> {
    const startedAt = new Date();
    const source = this.provider.source;

    let rawMembers: unknown[];
    try {
      rawMembers = await this.provider.fetchMembers();
    } catch (error) {
      // AC-002-04: si el proveedor falla no se modifica ningún usuario.
      const reason =
        error instanceof MembersProviderError
          ? error.message
          : 'Error inesperado al consultar el proveedor.';
      this.logger.warn({ err: error, source }, 'La importación de socios ha fallado');
      await this.saveFailure(actor, startedAt, reason);
      throw new BadGatewayException(`${reason} No se ha modificado ningún dato.`);
    }

    const imported = await this.prisma.user.findMany({
      where: { centerId: actor.centerId, externalSource: source, externalId: { not: null } },
      select: {
        id: true,
        externalId: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        externalMissingSince: true,
      },
    });
    const emails = rawMembers
      .map((raw) => (raw as { email?: unknown } | null)?.email)
      .filter((email): email is string => typeof email === 'string')
      .map((email) => email.trim().toLowerCase());
    const emailOwners = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });

    const plan = planImport(
      rawMembers,
      imported.map((user) => ({ ...user, externalId: user.externalId ?? '' })),
      emailOwners,
    );

    try {
      const run = await this.apply(actor, startedAt, plan);
      this.logger.log(
        {
          source,
          created: run.createdCount,
          updated: run.updatedCount,
          unchanged: run.unchangedCount,
          deactivated: run.deactivatedCount,
          errors: run.errorCount,
        },
        'Importación de socios completada',
      );
      return toMemberImportDto(run);
    } catch (error) {
      this.logger.error({ err: error, source }, 'No se ha podido guardar la importación');
      await this.saveFailure(actor, startedAt, 'Error al guardar los datos.');
      throw new InternalServerErrorException(
        'No se ha podido guardar la importación. No se ha modificado ningún dato.',
      );
    }
  }

  /** Todas las escrituras en una transacción: o se aplican todas o ninguna. */
  private apply(
    actor: AuthUser,
    startedAt: Date,
    plan: ImportPlan,
  ): Promise<MemberImportWithActor> {
    const source = this.provider.source;
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        if (plan.toCreate.length > 0) {
          await tx.user.createMany({
            data: plan.toCreate.map((member) => ({
              centerId: actor.centerId,
              role: Role.CLIENT,
              externalSource: source,
              ...member,
            })),
          });
        }
        for (const { id, member, reactivate } of plan.toUpdate) {
          await tx.user.update({
            where: { id },
            data: {
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              ...(reactivate ? { isActive: true, externalMissingSince: null } : {}),
            },
          });
        }
        if (plan.toDeactivate.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: plan.toDeactivate } },
            data: { isActive: false, externalMissingSince: now },
          });
          await tx.refreshToken.updateMany({
            where: { userId: { in: plan.toDeactivate }, revokedAt: null },
            data: { revokedAt: now },
          });
        }
        return tx.memberImport.create({
          data: {
            centerId: actor.centerId,
            triggeredById: actor.id,
            source,
            status: 'SUCCEEDED',
            startedAt,
            finishedAt: new Date(),
            createdCount: plan.toCreate.length,
            updatedCount: plan.toUpdate.length,
            unchangedCount: plan.unchanged,
            deactivatedCount: plan.toDeactivate.length,
            errorCount: plan.errors.length,
            errors: plan.errors.slice(0, MAX_STORED_ERRORS) as unknown as Prisma.InputJsonValue,
          },
          include: { triggeredBy: { select: { firstName: true, lastName: true } } },
        });
      },
      { timeout: 30_000 },
    );
  }

  private async saveFailure(actor: AuthUser, startedAt: Date, reason: string): Promise<void> {
    await this.prisma.memberImport.create({
      data: {
        centerId: actor.centerId,
        triggeredById: actor.id,
        source: this.provider.source,
        status: 'FAILED',
        startedAt,
        finishedAt: new Date(),
        failureReason: reason,
      },
    });
  }
}

export function toMemberImportDto(run: MemberImportWithActor): MemberImportDto {
  return {
    id: run.id,
    source: run.source,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt.toISOString(),
    durationMs: run.finishedAt.getTime() - run.startedAt.getTime(),
    triggeredBy: run.triggeredBy
      ? `${run.triggeredBy.firstName} ${run.triggeredBy.lastName}`
      : null,
    created: run.createdCount,
    updated: run.updatedCount,
    unchanged: run.unchangedCount,
    deactivated: run.deactivatedCount,
    errorCount: run.errorCount,
    errors: Array.isArray(run.errors) ? (run.errors as unknown as ImportError[]) : [],
    failureReason: run.failureReason,
  };
}
