import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injecte `request.user`, posé par la stratégie Passport active sur la route
 * (`AccessTokenPayload` derrière `JwtAuthGuard`, `{ sub }` derrière `JwtRefreshGuard`).
 * Le contrôleur annote le type attendu selon le guard appliqué.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user: unknown }>();
    return request.user;
  },
);
