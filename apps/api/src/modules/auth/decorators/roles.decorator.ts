import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../user/enums/user-role.enum';

export const ROLES_KEY = 'roles';

/** Marque une route comme réservée à certains rôles (§5.7 A01), lu par `RolesGuard`. */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
