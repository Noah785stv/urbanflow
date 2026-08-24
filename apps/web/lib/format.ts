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
