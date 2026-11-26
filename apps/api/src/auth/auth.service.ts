import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ActivateAccountRequest, SessionResponse, SessionUser } from '@bloom/shared';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from './auth-user';
import { LoginAttemptsService } from './login-attempts.service';
import { generateOpaqueToken, hashOpaqueToken } from './opaque-token';
import { PasswordService } from './password.service';

/** Resultado de abrir o renovar una sesión: lo que va en el cuerpo y lo que va en la cookie. */
export interface IssuedSession {
  body: SessionResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const INVALID_SESSION = 'La sesión ha caducado. Vuelve a iniciar sesión.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly attempts: LoginAttemptsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** AC-001-01, AC-001-02, AC-001-03. */
  async login(email: string, password: string, ip: string): Promise<IssuedSession> {
    if (this.attempts.isBlocked(ip, email)) {
      throw new HttpException(
        'Demasiados intentos fallidos. Espera unos minutos y vuelve a intentarlo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid =
      user?.isActive === true &&
      user.passwordHash !== null &&
      (await this.passwords.verify(user.passwordHash, password));

    if (!user || !valid) {
      this.attempts.registerFailure(ip, email);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    this.attempts.reset(ip, email);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(user, randomUUID());
  }

  /**
   * Rota el token de refresco (AC-001-04). Si el token ya estaba revocado, alguien lo ha
   * reutilizado: se revocan todas las sesiones del usuario (AC-001-05).
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashOpaqueToken(refreshToken) },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException(INVALID_SESSION);
    }
    if (stored.revokedAt) {
      await this.revokeAllSessions(stored.userId);
      throw new UnauthorizedException(INVALID_SESSION);
    }
    if (stored.expiresAt <= new Date() || !stored.user.isActive) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    // Solo una petición puede consumir el token aunque lleguen dos a la vez.
    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (consumed.count === 0) {
      await this.revokeAllSessions(stored.userId);
      throw new UnauthorizedException(INVALID_SESSION);
    }
    return this.issueSession(stored.user, stored.familyId);
  }

  /** AC-001-06. Cerrar sesión con un token desconocido no es un error. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Fija la contraseña con un enlace de activación válido. */
  async activate({ token, password }: ActivateAccountRequest): Promise<void> {
    const stored = await this.prisma.activationToken.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      include: { user: true },
    });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date() || !stored.user.isActive) {
      throw new UnauthorizedException(
        'El enlace de activación no es válido o ha caducado. Pide uno nuevo al administrador.',
      );
    }
    const passwordHash = await this.passwords.hash(password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.activationToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async me(userId: string): Promise<SessionUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toSessionUser(user);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueSession(user: User, familyId: string): Promise<IssuedSession> {
    const expiresIn = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    const payload: AccessTokenPayload = { sub: user.id, role: user.role, centerId: user.centerId };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });

    const refreshToken = generateOpaqueToken();
    const days = this.config.get('REFRESH_TTL_DAYS', { infer: true });
    const refreshExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hashOpaqueToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      body: { accessToken, expiresIn, user: toSessionUser(user) },
      refreshToken,
      refreshExpiresAt,
    };
  }
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    alias: user.alias,
    role: user.role,
    centerId: user.centerId,
  };
}
