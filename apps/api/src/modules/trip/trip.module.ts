import { Module } from '@nestjs/common';
import { CacheModule } from '../../common/cache/cache.module';
import { CarbonModule } from '../carbon/carbon.module';
import { IntegrationModule } from '../integration/integration.module';
import { DEFAULT_FARE_CONFIG, FARE_CONFIG } from './fare.constants';
import { FareEstimator } from './fare-estimator.service';
import { TripController } from './trip.controller';
import { TripPlannerService } from './trip-planner.service';

/**
 * Module Trip (§5.1) — planificateur multimodal (F2). Consomme
 * `ProviderRegistry` (exporté par `IntegrationModule`, F3) et
 * `CarbonEstimatorService` (`CarbonModule`) ; n'appelle aucune API externe
 * directement.
 */
@Module({
  imports: [IntegrationModule, CarbonModule, CacheModule],
  controllers: [TripController],
  providers: [
    TripPlannerService,
    FareEstimator,
    { provide: FARE_CONFIG, useValue: DEFAULT_FARE_CONFIG },
  ],
})
export class TripModule {}
