import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../types/access-token-payload.interface';

/** Valide le JWT d'accès porté par l'en-tête `Authorization: Bearer` (§5.7 A01). */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Le retour est attaché à `request.user` (utilisé par @CurrentUser()).
  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
