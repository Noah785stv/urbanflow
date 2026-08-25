import type { Coordinates } from '@urbanflow/shared-types';

const GEOCODING_BASE_URL =
  process.env.NEXT_PUBLIC_GEOCODING_URL ?? 'https://data.geopf.fr/geocodage';

export interface AddressSuggestion {
  label: string;
  coordinates: Coordinates;
}

interface GeocodingFeature {
  properties: { label: string };
  geometry: { coordinates: [number, number] };
}

interface GeocodingFeatureCollection {
  features: GeocodingFeature[];
}

function toCoordinates([longitude, latitude]: [number, number]): Coordinates {
  return { latitude, longitude };
}

/**
 * Géoplateforme IGN (Base Adresse Nationale), sans clé — appelée directement
 * depuis le navigateur (§A.2 web-geocoding-and-pages.md). Client dédié, pas
 * `apiRequest` : autre hôte, pas de jeton Bearer à porter.
 *
 * ⚠️ Ne jamais utiliser `api-adresse.data.gouv.fr` : décommissionné depuis
 * janvier 2026, il ne répond plus.
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const url = new URL(`${GEOCODING_BASE_URL}/search/`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '5');
  url.searchParams.set('autocomplete', '1');

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Recherche d'adresse indisponible (${response.status}).`);
  }

  const body = (await response.json()) as GeocodingFeatureCollection;
  return body.features.map((feature) => ({
    label: feature.properties.label,
    coordinates: toCoordinates(feature.geometry.coordinates),
  }));
}

/**
 * Géocodage inversé (position GPS / clic carte → adresse lisible). Renvoie
 * `null` si l'IGN ne trouve aucune adresse proche (ex. milieu rural) — repli
 * géré par l'appelant (`formatCoordinatesLabel`), jamais une exception qui
 * bloquerait l'usage de coordonnées par ailleurs valides.
 */
export async function reverseGeocode(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = new URL(`${GEOCODING_BASE_URL}/reverse/`);
  url.searchParams.set('lon', String(coordinates.longitude));
  url.searchParams.set('lat', String(coordinates.latitude));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Géocodage inversé indisponible (${response.status}).`);
  }

  const body = (await response.json()) as GeocodingFeatureCollection;
  return body.features[0]?.properties.label ?? null;
}

/** Repli textuel affiché tant que le géocodage inversé n'a pas résolu (ou a échoué). */
export function formatCoordinatesLabel(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
}
