import { Module } from '@nestjs/common';
import { CarbonEstimatorService } from './carbon-estimator.service';
import {
  DEFAULT_EMISSION_FACTORS,
  EMISSION_FACTORS,
} from './emission-factors.constants';

/**
 * Module Carbon (§5.1) — empreinte carbone. `CarbonEstimatorService` fournit
 * l'estimation à la volée consommée par F2 (Sprint 4) ; F4 (Sprint 5)
 * l'étendra avec la persistance (`emission_factor`, `carbon_log`) sans
 * changer l'interface du service, grâce au token `EMISSION_FACTORS` injecté.
 */
@Module({
  providers: [
    CarbonEstimatorService,
    { provide: EMISSION_FACTORS, useValue: DEFAULT_EMISSION_FACTORS },
  ],
  exports: [CarbonEstimatorService],
})
export class CarbonModule {}
