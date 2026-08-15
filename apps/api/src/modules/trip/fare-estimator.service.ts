import { Inject, Injectable } from '@nestjs/common';
import { JourneySection, TransportMode } from '@urbanflow/shared-types';
import {
  FARE_CONFIG,
  FareConfig,
  FREE_MODES,
  TRANSIT_MODES,
} from './fare.constants';

/**
 * Estimation du coût indicatif d'un itinéraire (§5.3). Approximation
 * assumée — à marquer explicitement comme telle côté API (`estimatedCostCents`
 * peut valoir `null`), jamais présentée comme un tarif garanti.
 */
@Injectable()
export class FareEstimator {
  constructor(@Inject(FARE_CONFIG) private readonly config: FareConfig) {}

  /**
   * `null` dès qu'une section porte un mode hors barème (ex. VAE, covoiturage) :
   * le trajet entier devient alors non estimable et inéligible au label
   * `cheapest` (§5.3), plutôt que de publier un coût partiel trompeur.
   */
  estimateCents(sections: JourneySection[]): number | null {
    let totalCents = 0;
    let hasTransit = false;

    for (const section of sections) {
      if (TRANSIT_MODES.includes(section.mode)) {
        hasTransit = true;
        continue;
      }
      if (FREE_MODES.includes(section.mode)) {
        continue;
      }
      if (section.mode === TransportMode.Scooter) {
        const minutes = section.durationSeconds / 60;
        totalCents +=
          this.config.scooterUnlockCents +
          minutes * this.config.scooterPerMinuteCents;
        continue;
      }
      if (section.mode === TransportMode.CarSolo) {
        const km = section.distanceMeters / 1000;
        totalCents += km * this.config.carSoloPerKmCents;
        continue;
      }
      return null;
    }

    if (hasTransit) {
      totalCents += this.config.transitFlatCents;
    }

    return Math.round(totalCents);
  }
}
