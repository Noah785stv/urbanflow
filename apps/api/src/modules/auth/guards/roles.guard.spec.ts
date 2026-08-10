import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/enums/user-role.enum';
import { RolesGuard } from './roles.guard';

function buildContext(user: { role: UserRole } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it("autorise l'accès quand la route ne déclare aucun rôle requis", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: UserRole.Citizen }))).toBe(
      true,
    );
  });

  it("autorise l'accès quand le rôle de l'utilisateur est autorisé", () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue([UserRole.Admin, UserRole.Premium]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: UserRole.Premium }))).toBe(
      true,
    );
  });

  it("refuse l'accès (403) quand le rôle de l'utilisateur n'est pas autorisé", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(buildContext({ role: UserRole.Citizen })),
    ).toThrow(ForbiddenException);
  });

  it("refuse l'accès quand aucun utilisateur n'est attaché à la requête", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.Admin]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
