'use client';

import type { StationNearbyResult } from '@urbanflow/shared-types';
import { formatDistance, formatStationAvailability } from '../../lib/format';
import { Button } from '../ui/button';

export type NearbyStationsStatus = 'idle' | 'loading' | 'error';

interface NearbyStationsProps {
  enabled: boolean;
  status: NearbyStationsStatus;
  stations: StationNearbyResult[];
  onToggle: () => void;
}

function announcement(status: NearbyStationsStatus, count: number): string {
  if (status === 'loading') {
    return 'Recherche des stations à proximité…';
  }
  if (status === 'error') {
    return '';
  }
  return count === 0
    ? 'Aucune station de mobilité partagée trouvée à proximité.'
    : `${count} station${count > 1 ? 's' : ''} de mobilité partagée trouvée${count > 1 ? 's' : ''} à proximité.`;
}

/**
 * Stations de mobilité partagée à proximité (§6-9 web-gbfs-stations.md).
 * `stationType` vaut toujours `"dock"` côté GBFS (limitation assumée, cf.
 * ProviderRegistry/GbfsProvider) : jamais de distinction vélo/trottinette
 * ici, on affiche des « stations de mobilité partagée ». La carte
 * (marqueurs, `TripMap`) est un complément visuel — cette liste est la
 * source garantie accessible, même schéma que `MonthlyChart` (graphe
 * décoratif + table toujours visible).
 */
export function NearbyStations({ enabled, status, stations, onToggle }: NearbyStationsProps) {
  return (
    <section aria-labelledby="nearby-stations-heading" className="flex flex-col gap-3">
      <h2
        id="nearby-stations-heading"
        className="text-[20px] font-semibold leading-[26px] text-ink-900"
      >
        Vélos/trottinettes à proximité
      </h2>

      <Button type="button" variant="secondary" aria-pressed={enabled} onClick={onToggle}>
        {enabled ? 'Masquer les stations à proximité' : 'Afficher les stations à proximité'}
      </Button>

      {/* Uniquement présente une fois la recherche activée : sur le reste du
          planificateur, la page ne doit garder qu'une seule région "status"
          (celle de `TripResults`) tant que cette fonctionnalité à la demande
          n'a pas été sollicitée. */}
      {enabled && (
        <p role="status" className="sr-only">
          {announcement(status, stations.length)}
        </p>
      )}

      {enabled && status === 'error' && (
        <p className="text-sm font-medium text-alert-600">
          Recherche des stations impossible pour le moment.
        </p>
      )}

      {enabled && status === 'loading' && (
        <p className="text-sm text-ink-600">Recherche en cours…</p>
      )}

      {enabled && status === 'idle' && stations.length === 0 && (
        <p className="text-sm text-ink-600">
          Aucune station de mobilité partagée trouvée à proximité.
        </p>
      )}

      {enabled && status === 'idle' && stations.length > 0 && (
        <ul className="flex flex-col gap-2">
          {stations.map((result) => (
            <li
              key={result.station.id}
              className="rounded-control border border-line-200 bg-surface-0 p-3 text-sm"
            >
              <p className="font-semibold text-ink-900">{result.station.name}</p>
              <p className="font-mono text-ink-600">{formatDistance(result.distanceMeters)}</p>
              <p className="text-ink-900">{formatStationAvailability(result.status)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
