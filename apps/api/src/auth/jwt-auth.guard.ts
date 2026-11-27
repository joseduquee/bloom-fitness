import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessTokenVerifier } from './access-token.verifier';
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
    private readonly verifier: AccessTokenVerifier,
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
    request.user = await this.verifier.verify(token);
    return true;
  }
}
