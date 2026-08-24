import type { Coordinates } from '@urbanflow/shared-types';

/** Centre de la métropole de Rennes — repli si la géolocalisation échoue/est refusée (§6). */
export const RENNES_CENTER: Coordinates = { latitude: 48.1173, longitude: -1.6778 };

export interface GeolocationResult extends Coordinates {
  accuracyMeters: number;
}

function describeGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Géolocalisation refusée.';
    case error.POSITION_UNAVAILABLE:
      return 'Position indisponible.';
    case error.TIMEOUT:
      return 'Délai de géolocalisation dépassé.';
    default:
      return 'Erreur de géolocalisation.';
  }
}

/**
 * API Geolocation du navigateur (§6). Ne force jamais la géolocalisation :
 * l'appelant décide du repli (centre métropole, position manuelle) en cas
 * de refus/échec — jamais d'accès silencieux ni de blocage de l'UI.
 */
export function getCurrentPosition(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Géolocalisation non disponible sur ce navigateur.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      (error) => reject(new Error(describeGeolocationError(error))),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
