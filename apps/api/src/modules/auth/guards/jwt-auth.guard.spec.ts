import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../user/enums/user-role.enum';
import { JwtAccessStrategy } from '../strategies/jwt-access.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

const SECRET = 'access-secret-at-least-16-chars';

function buildContext(authorizationHeader?: string): ExecutionContext {
  const request = {
    headers: authorizationHeader ? { authorization: authorizationHeader } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard (§5.7 A01)', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      providers: [
        JwtAccessStrategy,
        { provide: ConfigService, useValue: { getOrThrow: () => SECRET } },
      ],
    }).compile();

    // Instancier la stratégie l'enregistre auprès du Passport global sous le nom 'jwt'.
    moduleRef.get(JwtAccessStrategy);
    jwtService = new JwtService({ secret: SECRET });
    guard = new JwtAuthGuard();
  });

  it('autorise la requête avec un access token valide', async () => {
    const token = jwtService.sign({
      sub: 'user-id',
      tenantId: 'tenant-id',
      role: UserRole.Citizen,
    });

    await expect(
      guard.canActivate(buildContext(`Bearer ${token}`)),
    ).resolves.toBe(true);
  });

  it("rejette la requête sans en-tête d'autorisation", async () => {
    await expect(guard.canActivate(buildContext())).rejects.toThrow();
  });

  it('rejette la requête avec un token invalide', async () => {
    await expect(
      guard.canActivate(buildContext('Bearer token-invalide')),
    ).rejects.toThrow();
  });
});
