import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '../../common/cache/cache.module';
import { Station } from './entities/station.entity';
import { GbfsSyncScheduler } from './providers/gbfs/gbfs-sync.scheduler';
import { GbfsProvider } from './providers/gbfs/gbfs.provider';
import { NavitiaProvider } from './providers/navitia/navitia.provider';
import { ProviderRegistry } from './providers/provider-registry.service';
import { TRANSPORT_PROVIDERS } from './providers/provider.tokens';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';
import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';

/**
 * Module Integration (§5.1) — SEUL point de contact avec les APIs de
 * transport externes (Navitia, GBFS). Ajouter un opérateur = implémenter
 * l'interface `TransportProvider` adéquate et l'ajouter à la factory
 * `TRANSPORT_PROVIDERS` ci-dessous, sans toucher au reste du module (§5).
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
    NavitiaProvider,
    GbfsSyncScheduler,
    ProviderRegistry,
    StationsService,
    StopsService,
    {
      provide: TRANSPORT_PROVIDERS,
      useFactory: (gbfs: GbfsProvider, navitia: NavitiaProvider) => [
        gbfs,
        navitia,
      ],
      inject: [GbfsProvider, NavitiaProvider],
    },
  ],
})
export class IntegrationModule {}
