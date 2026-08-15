import { Inject, Injectable } from '@nestjs/common';
import { JourneySection } from '@urbanflow/shared-types';
import {
  EMISSION_FACTORS,
  EmissionFactorTable,
} from './emission-factors.constants';

/**
 * Calcul de l'empreinte carbone d'un itinéraire (§4.7.3, §5.2) :
 * `émissions(Trip) = Σ [ distance(Segment) × facteur(Mode) ]`. Fonction pure,
 * déterministe et reproductible — testée à 100 % (module clé, DoD §6.5).
 * Ne persiste rien : F4 étendra ce service pour l'historisation (`carbon_log`).
 */
@Injectable()
export class CarbonEstimatorService {
  constructor(
    @Inject(EMISSION_FACTORS) private readonly factors: EmissionFactorTable,
  ) {}

  estimateGrams(sections: JourneySection[]): number {
    const totalGrams = sections.reduce((total, section) => {
      const distanceKm = section.distanceMeters / 1000;
      return total + distanceKm * this.factors[section.mode];
    }, 0);

    return Math.round(totalGrams);
  }
}
