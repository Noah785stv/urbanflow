import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../user/enums/user-role.enum';
import { JwtAccessStrategy } from './jwt-access.strategy';

describe('JwtAccessStrategy', () => {
  it('retourne le payload du JWT tel quel (attaché à request.user)', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('access-secret-at-least-16-chars'),
    } as unknown as ConfigService;
    const strategy = new JwtAccessStrategy(configService);

    const payload = {
      sub: 'user-id',
      tenantId: 'tenant-id',
      role: UserRole.Citizen,
    };

    expect(strategy.validate(payload)).toBe(payload);
  });
});
