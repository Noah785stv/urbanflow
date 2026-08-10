import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MobilityProfile } from '../user/entities/mobility-profile.entity';
import { User } from '../user/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { asJwtDuration } from './utils/jwt-duration.util';

/** Module Auth (§5.1) — authentification, sessions, RBAC (F1). */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, MobilityProfile]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: asJwtDuration(config.get<string>('JWT_EXPIRES_IN', '15m')),
        },
      }),
    }),
    // Rate limiting (§5.7 A07) — appliqué uniquement sur register/login via
    // @UseGuards(ThrottlerGuard) dans AuthController, pas globalement.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 10 }] }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
