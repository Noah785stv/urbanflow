/**
 * Déclenche un téléchargement depuis un `Blob` déjà en mémoire (§4
 * F4-web-dashboard.md) : un `<a href>` classique ne peut pas porter l'en-tête
 * `Authorization`, donc le blob doit être récupéré via `fetch` authentifié en
 * amont — cette fonction ne fait que le "sauvegarder" côté navigateur.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
