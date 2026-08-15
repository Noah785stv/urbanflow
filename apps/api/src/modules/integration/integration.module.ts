import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../../common/cache/cache.module';
import { Station } from './entities/station.entity';
import { GbfsSyncScheduler } from './providers/gbfs/gbfs-sync.scheduler';
import { GbfsProvider } from './providers/gbfs/gbfs.provider';
import { OtpProvider } from './providers/otp/otp.provider';
import { ProviderRegistry } from './providers/provider-registry.service';
import { TRANSPORT_PROVIDERS } from './providers/provider.tokens';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';
import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';

/**
 * Module Integration (§5.1) — SEUL point de contact avec les APIs de
 * transport externes (OpenTripPlanner, GBFS — ADR-005). Ajouter un opérateur
 * = implémenter l'interface `TransportProvider` adéquate et l'ajouter à la
 * factory `TRANSPORT_PROVIDERS` ci-dessous, sans toucher au reste du module
 * (§5). `ProviderRegistry` est exporté pour être consommé par F2
 * (TripPlannerService).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Station]),
    HttpModule,
    ScheduleModule.forRoot(),
    CacheModule,
  ],
  controllers: [StationsController, StopsController],
  providers: [
    GbfsProvider,
    OtpProvider,
    GbfsSyncScheduler,
    ProviderRegistry,
    StationsService,
    StopsService,
    {
      provide: TRANSPORT_PROVIDERS,
      useFactory: (gbfs: GbfsProvider, otp: OtpProvider) => [gbfs, otp],
      inject: [GbfsProvider, OtpProvider],
    },
  ],
  exports: [ProviderRegistry],
})
export class IntegrationModule {}
