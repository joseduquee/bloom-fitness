import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@bloom/shared';
import type { Request } from 'express';
import { ROLES_KEY } from './decorators/roles.decorator';

/** Comprueba que el rol del usuario está entre los permitidos por @Roles() (AC-001-08). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para realizar esta acción.');
    }
    return true;
  }
}
