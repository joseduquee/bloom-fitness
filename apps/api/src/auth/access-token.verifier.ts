import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload, AuthUser } from './auth-user';

/**
 * Valida un token de acceso y comprueba que el usuario sigue activo (AC-001-07, AC-001-12).
 * La usan la guarda HTTP y el canal en tiempo real (AC-004-16).
 */
@Injectable()
export class AccessTokenVerifier {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async verify(token: string | undefined): Promise<AuthUser> {
    if (!token) throw new UnauthorizedException('No has iniciado sesión.');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('La sesión ha caducado. Vuelve a iniciar sesión.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, centerId: true, isActive: true },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Tu cuenta no está activa.');
    }
    return { id: user.id, role: user.role, centerId: user.centerId };
  }
}
