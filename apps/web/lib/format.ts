export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} h ${minutes.toString().padStart(2, '0')} min`;
  }
  return `${minutes} min`;
}

export function formatCo2(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg CO2e`;
  }
  return `${grams} g CO2e`;
}

export function formatCost(cents: number | null): string {
  if (cents === null) {
    return 'estimation indisponible';
  }
  return (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  });
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Texte de disponibilité d'une station de mobilité partagée (§6-7
 * web-gbfs-stations.md) — partagé par le popup carte et la liste
 * accessible, pour ne jamais désynchroniser les deux. `status` peut être
 * `null` (aucune disponibilité connue) ; `stale` signale une donnée non
 * temps réel (dernière valeur connue en mode dégradé).
 */
export function formatStationAvailability(
  status: {
    bikesAvailable: number;
    docksAvailable: number;
    updatedAt: string;
    stale: boolean;
  } | null,
): string {
  if (!status) {
    return 'Disponibilité indisponible.';
  }

  const bikes = `${status.bikesAvailable} vélo${status.bikesAvailable > 1 ? 's' : ''} disponible${status.bikesAvailable > 1 ? 's' : ''}`;
  const docks = `${status.docksAvailable} place${status.docksAvailable > 1 ? 's' : ''}`;
  const base = `${bikes} · ${docks}`;

  if (status.stale) {
    const time = new Date(status.updatedAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${base} (dernière mise à jour à ${time})`;
  }

  return base;
}
