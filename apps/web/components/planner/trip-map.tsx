'use client';

import type { Coordinates, PlannedJourney } from '@urbanflow/shared-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { decodeSections } from '../../lib/decode-geometry';
import { RENNES_CENTER } from '../../lib/geolocation';
import { MODE_COLORS } from '../../lib/mode-labels';

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

interface FitBoundsProps {
  positions: [number, number][];
}

/** Recadre la carte sur le tracé sélectionné (F2-geometry §6). */
function FitBounds({ positions }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }
    map.fitBounds(positions, { padding: [32, 32] });
  }, [map, positions]);

  return null;
}

interface TripMapProps {
  origin: Coordinates | null;
  destination: Coordinates | null;
  onMapClick: (coordinates: Coordinates) => void;
  selectedJourney: PlannedJourney | null;
}

/**
 * Carte Leaflet + OSM (§7) — complément visuel : le clic pose
 * origine/destination, mais la source d'information accessible reste la
 * liste de résultats et les champs de coordonnées (§7, §11), pas la carte.
 * Le tracé de l'itinéraire sélectionné (F2-geometry) est un tronçon par
 * `Polyline`, coloré par mode ; un tronçon sans géométrie n'est pas dessiné.
 */
export default function TripMap({
  origin,
  destination,
  onMapClick,
  selectedJourney,
}: TripMapProps) {
  const center = origin ?? RENNES_CENTER;

  const decodedSections = useMemo(
    () => (selectedJourney ? decodeSections(selectedJourney.sections) : []),
    [selectedJourney],
  );
  const allPositions = useMemo(
    () => decodedSections.flatMap((section) => section.positions),
    [decodedSections],
  );

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
      {decodedSections.map((section, index) => (
        <Polyline
          key={`${section.mode}-${index}`}
          positions={section.positions}
          pathOptions={{ color: MODE_COLORS[section.mode], weight: 5, opacity: 0.8 }}
        />
      ))}
      {allPositions.length > 0 && <FitBounds positions={allPositions} />}
      {origin && <Marker position={[origin.latitude, origin.longitude]} icon={originIcon} />}
      {destination && (
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon} />
      )}
    </MapContainer>
  );
}
