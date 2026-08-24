import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarbonEstimatorService } from './carbon-estimator.service';
import { CarbonLogController } from './carbon-log.controller';
import { CarbonLogService } from './carbon-log.service';
import { CarbonReportService } from './carbon-report.service';
import { EmissionFactorService } from './emission-factor.service';
import { EMISSION_FACTORS } from './emission-factors.constants';
import { CarbonLog } from './entities/carbon-log.entity';
import { EmissionFactor } from './entities/emission-factor.entity';

/**
 * Module Carbon (§5.1) — empreinte carbone. `CarbonEstimatorService` fournit
 * l'estimation pure (F2, testée 100 %, jamais modifiée). F4 branche une
 * source versionnée en base sur le token `EMISSION_FACTORS` (repli sur
 * `DEFAULT_EMISSION_FACTORS` si `emission_factor` est vide, voir
 * `EmissionFactorService`) et ajoute la persistance/agrégation des trajets
 * confirmés (`CarbonLogService`, `carbon_log`).
 */
@Module({
  imports: [TypeOrmModule.forFeature([EmissionFactor, CarbonLog])],
  controllers: [CarbonLogController],
  providers: [
    CarbonEstimatorService,
    EmissionFactorService,
    CarbonLogService,
    CarbonReportService,
    {
      provide: EMISSION_FACTORS,
      inject: [EmissionFactorService],
      useFactory: (service: EmissionFactorService) =>
        service.getCurrentFactors(),
    },
  ],
  exports: [CarbonEstimatorService, CarbonLogService],
})
export class CarbonModule {}
