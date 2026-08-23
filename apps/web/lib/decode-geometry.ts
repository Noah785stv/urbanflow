import type { JourneySection, TransportMode } from '@urbanflow/shared-types';
import polyline from '@mapbox/polyline';

export interface DecodedSection {
  mode: TransportMode;
  /** Paires [latitude, longitude], format attendu par `react-leaflet`. */
  positions: [number, number][];
}

/**
 * Décode `section.geometry` (polyligne encodée, format Google, précision 5 —
 * F2-geometry §3) en une liste de points exploitable par Leaflet. Fonction
 * pure, séparée du composant carte pour rester testable sans Leaflet/jsdom.
 * Un tronçon sans géométrie est simplement omis, jamais une erreur (§6).
 */
export function decodeSections(sections: JourneySection[]): DecodedSection[] {
  const decoded: DecodedSection[] = [];

  for (const section of sections) {
    if (!section.geometry) {
      continue;
    }
    decoded.push({
      mode: section.mode,
      positions: polyline.decode(section.geometry, 5) as [number, number][],
    });
  }

  return decoded;
}
