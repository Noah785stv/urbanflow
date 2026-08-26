import { Button } from '../ui/button';

interface MapPlaceholderProps {
  onShow: () => void;
}

/**
 * Remplace la carte tant qu'elle n'a pas été sollicitée (§C5, passe
 * éco-conception) : évite de charger le chunk Leaflet et les tuiles OSM au
 * chargement initial du planificateur, alors que rien ne garantit que
 * l'utilisateur en aura besoin (parcours 100% clavier/adresse possible sans
 * jamais toucher la carte). Même gabarit que <TripMap> (`h-full w-full`),
 * pour ne provoquer aucun saut de mise en page à l'activation.
 */
export function MapPlaceholder({ onShow }: MapPlaceholderProps) {
  return (
    <div className="flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-3 rounded border border-line-200 bg-surface-50 p-4 text-center">
      <p className="text-sm text-ink-600">
        La carte permet aussi de poser l&rsquo;origine et la destination d&rsquo;un clic.
      </p>
      <Button type="button" variant="secondary" onClick={onShow}>
        Afficher la carte
      </Button>
    </div>
  );
}
