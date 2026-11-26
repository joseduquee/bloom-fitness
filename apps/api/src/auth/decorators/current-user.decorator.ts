import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth-user';

/** Inyecta en el controlador el usuario autenticado de la petición. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new UnauthorizedException('No has iniciado sesión.');
    }
    return request.user;
  },
);
