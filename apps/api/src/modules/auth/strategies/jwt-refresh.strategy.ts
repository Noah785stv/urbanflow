import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type Redis from 'ioredis';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import { refreshTokenRedisKey } from '../auth.constants';
import { RefreshTokenPayload } from '../types/refresh-token-payload.interface';

/**
 * Valide le JWT de rafraîchissement, puis vérifie sa présence en Redis pour
 * permettre la révocation (§5.2 — `logout` supprime la clé, une nouvelle
 * connexion la remplace).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: RefreshTokenPayload): Promise<{ sub: string }> {
    const storedJti = await this.redis.get(refreshTokenRedisKey(payload.sub));
    if (!storedJti || storedJti !== payload.jti) {
      throw new UnauthorizedException(
        'Session de rafraîchissement invalide ou révoquée.',
      );
    }

    return { sub: payload.sub };
  }
}
