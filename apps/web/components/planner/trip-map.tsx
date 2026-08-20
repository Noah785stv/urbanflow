'use client';

import type { Coordinates } from '@urbanflow/shared-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { RENNES_CENTER } from '../../lib/geolocation';

function createPinIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 24 24" width="28" height="28" role="img" aria-label="${label}" fill="${color}" stroke="white" stroke-width="1.5"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

const originIcon = createPinIcon('#1d4ed8', 'Origine');
const destinationIcon = createPinIcon('#b91c1c', 'Destination');

interface ClickHandlerProps {
  onMapClick: (coordinates: Coordinates) => void;
}

function ClickHandler({ onMapClick }: ClickHandlerProps) {
  useMapEvents({
    click(event) {
      onMapClick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

interface TripMapProps {
  origin: Coordinates | null;
  destination: Coordinates | null;
  onMapClick: (coordinates: Coordinates) => void;
}

/**
 * Carte Leaflet + OSM (§7) — complément visuel : le clic pose
 * origine/destination, mais la source d'information accessible reste la
 * liste de résultats et les champs de coordonnées (§7, §11), pas la carte.
 */
export default function TripMap({ origin, destination, onMapClick }: TripMapProps) {
  const center = origin ?? RENNES_CENTER;

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={13}
      scrollWheelZoom
      className="h-full min-h-[320px] w-full rounded"
      aria-label="Carte de la métropole de Rennes — cliquez pour définir un point"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      {origin && <Marker position={[origin.latitude, origin.longitude]} icon={originIcon} />}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon} />
      )}
    </MapContainer>
  );
}
