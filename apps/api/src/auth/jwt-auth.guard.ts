import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { AccessTokenPayload } from './auth-user';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * Guarda global: toda ruta exige un token de acceso válido salvo las marcadas con @Public()
 * (AC-001-07). Comprueba además que el usuario sigue activo, para que desactivarlo tenga
 * efecto inmediato y no al caducar el token (AC-001-12).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('No has iniciado sesión.');
    }

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
    request.user = { id: user.id, role: user.role, centerId: user.centerId };
    return true;
  }
}
