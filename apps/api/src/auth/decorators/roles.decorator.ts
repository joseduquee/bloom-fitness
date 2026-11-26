import { SetMetadata } from '@nestjs/common';
import type { Role } from '@bloom/shared';

export const ROLES_KEY = 'roles';

/** Restringe una ruta a los roles indicados (RF-02). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
