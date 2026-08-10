import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenPayload } from '../types/access-token-payload.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../user/enums/user-role.enum';

/** RBAC (§5.7 A01) : autorise l'accès si l'utilisateur a l'un des rôles requis par `@Roles()`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Rôle insuffisant pour accéder à cette ressource.',
      );
    }

    return true;
  }
}
