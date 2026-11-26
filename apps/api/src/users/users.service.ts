import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  membersProviderLabel,
  Role,
  type ActivationLinkResponse,
  type CreateUserResponse,
  type User as UserDto,
  type UserList,
  type UserStatus,
} from '@bloom/shared';
import type { z } from 'zod';
import type {
  createUserRequestSchema,
  listUsersQuerySchema,
  updateUserRequestSchema,
} from '@bloom/shared';
import { ActivationTokensService } from '../auth/activation-tokens.service';
import type { AuthUser } from '../auth/auth-user';
import { AuthService } from '../auth/auth.service';
import { Prisma, type User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateUserInput = z.output<typeof createUserRequestSchema>;
type UpdateUserInput = z.output<typeof updateUserRequestSchema>;
type ListUsersInput = z.output<typeof listUsersQuerySchema>;

const NOT_FOUND = 'No se ha encontrado el usuario.';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activationTokens: ActivationTokensService,
    private readonly auth: AuthService,
  ) {}

  /** AC-001-14. El entrenador solo ve clientes. */
  async list(actor: AuthUser, query: ListUsersInput): Promise<UserList> {
    const where: Prisma.UserWhereInput = {
      centerId: actor.centerId,
      role: actor.role === Role.TRAINER ? Role.CLIENT : query.role,
      ...statusFilter(query.status),
    };
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { firstName: contains },
        { lastName: contains },
        { email: contains },
        { alias: contains },
      ];
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(toUserDto), total, page: query.page, pageSize: query.pageSize };
  }

  /** AC-001-09: lo que un usuario no puede ver responde como si no existiera. */
  async get(actor: AuthUser, id: string): Promise<UserDto> {
    return toUserDto(await this.findVisible(actor, id));
  }

  /** AC-001-10, AC-001-11. */
  async create(actor: AuthUser, input: CreateUserInput): Promise<CreateUserResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          centerId: actor.centerId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          alias: input.alias || null,
          role: input.role,
        },
      });
      const link = await this.activationTokens.issue(user.id);
      return { user: toUserDto(user), activationUrl: link.activationUrl };
    } catch (error) {
      throw mapUniqueEmail(error);
    }
  }

  async update(actor: AuthUser, id: string, input: UpdateUserInput): Promise<UserDto> {
    const user = await this.findVisible(actor, id);
    if (user.id === actor.id && input.role && input.role !== Role.ADMIN) {
      throw new UnprocessableEntityException('No puedes quitarte el rol de administrador.');
    }
    assertProtectedFieldsUnchanged(user, input);
    try {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          alias: input.alias === undefined ? undefined : input.alias || null,
          role: input.role,
        },
      });
      return toUserDto(updated);
    } catch (error) {
      throw mapUniqueEmail(error);
    }
  }

  /** AC-001-12: no puede iniciar sesión, pierde sus sesiones y conserva su histórico. */
  async deactivate(actor: AuthUser, id: string): Promise<UserDto> {
    const user = await this.findVisible(actor, id);
    if (user.id === actor.id) {
      throw new UnprocessableEntityException('No puedes desactivar tu propia cuenta.');
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.auth.revokeAllSessions(id);
    return toUserDto(updated);
  }

  async reactivate(actor: AuthUser, id: string): Promise<UserDto> {
    await this.findVisible(actor, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true, externalMissingSince: null },
    });
    return toUserDto(updated);
  }

  /** AC-001-16: el administrador puede generar y copiar un enlace nuevo. */
  async newActivationLink(actor: AuthUser, id: string): Promise<ActivationLinkResponse> {
    const user = await this.findVisible(actor, id);
    if (!user.isActive) {
      throw new UnprocessableEntityException('Reactiva el usuario antes de enviarle un enlace.');
    }
    const link = await this.activationTokens.issue(user.id);
    return { activationUrl: link.activationUrl, expiresAt: link.expiresAt.toISOString() };
  }

  /**
   * Comprueba que el usuario es un cliente visible para quien hace la petición (spec 003, rutinas).
   * 404 si no existe o no se puede ver; 422 si no es cliente.
   */
  async getClient(actor: AuthUser, id: string): Promise<UserDto> {
    const user = await this.findVisible(actor, id);
    if (user.role !== Role.CLIENT) {
      throw new UnprocessableEntityException('Las rutinas solo se asignan a clientes.');
    }
    return toUserDto(user);
  }

  private async findVisible(actor: AuthUser, id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({ where: { id, centerId: actor.centerId } });
    if (!user) throw new NotFoundException(NOT_FOUND);
    const visible =
      actor.role === Role.ADMIN ||
      (actor.role === Role.TRAINER && (user.role === Role.CLIENT || user.id === actor.id)) ||
      (actor.role === Role.CLIENT && user.id === actor.id);
    if (!visible) throw new NotFoundException(NOT_FOUND);
    return user;
  }
}

export function userStatus(user: Pick<User, 'isActive' | 'passwordHash'>): UserStatus {
  if (!user.isActive) return 'INACTIVE';
  return user.passwordHash ? 'ACTIVE' : 'PENDING';
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    alias: user.alias,
    role: user.role,
    status: userStatus(user),
    externalSource: user.externalSource,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * AC-002-07 y AC-001-13: en un usuario importado, nombre, apellidos y correo se cambian en el proveedor.
 * Repetir el valor que ya tiene no es un cambio, así el formulario puede enviar todos sus campos.
 */
function assertProtectedFieldsUnchanged(user: User, input: UpdateUserInput): void {
  if (!user.externalSource) return;
  const changed = (['firstName', 'lastName', 'email'] as const).some(
    (field) => input[field] !== undefined && input[field] !== user[field],
  );
  if (changed) {
    throw new UnprocessableEntityException(
      `El nombre, los apellidos y el correo de este usuario se gestionan en ${membersProviderLabel(user.externalSource)}.`,
    );
  }
}

function statusFilter(status: UserStatus | undefined): Prisma.UserWhereInput {
  switch (status) {
    case 'INACTIVE':
      return { isActive: false };
    case 'PENDING':
      return { isActive: true, passwordHash: null };
    case 'ACTIVE':
      return { isActive: true, passwordHash: { not: null } };
    default:
      return {};
  }
}

function mapUniqueEmail(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictException('Ya existe un usuario con ese correo electrónico.');
  }
  return error;
}
