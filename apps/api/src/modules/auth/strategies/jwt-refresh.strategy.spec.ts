import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { refreshTokenRedisKey } from '../auth.constants';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('refresh-secret-at-least-16-chars'),
  } as unknown as ConfigService;

  it("retourne l'utilisateur quand le jti correspond à celui stocké en Redis", async () => {
    const redis = { get: jest.fn().mockResolvedValue('current-jti') };
    const strategy = new JwtRefreshStrategy(configService, redis as never);

    const result = await strategy.validate({
      sub: 'user-id',
      jti: 'current-jti',
    });

    expect(redis.get).toHaveBeenCalledWith(refreshTokenRedisKey('user-id'));
    expect(result).toEqual({ sub: 'user-id' });
  });

  it("rejette si aucun refresh token n'est enregistré (déjà déconnecté)", async () => {
    const redis = { get: jest.fn().mockResolvedValue(null) };
    const strategy = new JwtRefreshStrategy(configService, redis as never);

    await expect(
      strategy.validate({ sub: 'user-id', jti: 'current-jti' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejette si le jti ne correspond plus (token révoqué/remplacé)', async () => {
    const redis = { get: jest.fn().mockResolvedValue('un-autre-jti') };
    const strategy = new JwtRefreshStrategy(configService, redis as never);

    await expect(
      strategy.validate({ sub: 'user-id', jti: 'current-jti' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
