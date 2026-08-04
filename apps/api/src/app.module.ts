import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { CarbonModule } from './modules/carbon/carbon.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { NotificationModule } from './modules/notification/notification.module';
import { TripModule } from './modules/trip/trip.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    // Modules métier (§5.1) — squelettes, implémentés aux sprints suivants
    AuthModule,
    UserModule,
    TripModule,
    CarbonModule,
    IntegrationModule,
    NotificationModule,
  ],
})
export class AppModule {}
