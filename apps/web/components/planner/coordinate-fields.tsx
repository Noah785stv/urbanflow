'use client';

import type { Coordinates } from '@urbanflow/shared-types';
import { useState } from 'react';
import { Input } from '../ui/input';

interface CoordinateFieldsProps {
  legend: string;
  idPrefix: string;
  value: Coordinates | null;
  onChange: (coordinates: Coordinates | null) => void;
}

function formatValue(value: Coordinates | null): { lat: string; lon: string } {
  return {
    lat: value ? value.latitude.toFixed(5) : '',
    lon: value ? value.longitude.toFixed(5) : '',
  };
}

/**
 * Saisie manuelle lat/lng — chemin clavier complet pour poser
 * origine/destination (§11), en complément du clic carte et de la
 * géolocalisation. Commit au blur (pas de géocodage d'adresse, exclu du
 * périmètre — §2).
 */
export function CoordinateFields({ legend, idPrefix, value, onChange }: CoordinateFieldsProps) {
  const [latText, setLatText] = useState(() => formatValue(value).lat);
  const [lonText, setLonText] = useState(() => formatValue(value).lon);
  // Resynchronise l'affichage quand `value` change de l'extérieur (géoloc,
  // clic carte) — ajustement pendant le rendu (pattern React officiel),
  // pas un effet, pour éviter un flash de texte périmé.
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    const formatted = formatValue(value);
    setLatText(formatted.lat);
    setLonText(formatted.lon);
  }

  function commit(nextLatText: string, nextLonText: string) {
    const latitude = Number(nextLatText);
    const longitude = Number(nextLonText);
    if (
      nextLatText === '' ||
      nextLonText === '' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      onChange(null);
      return;
    }
    onChange({ latitude, longitude });
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[13px] font-semibold uppercase tracking-[0.08em] leading-[18px] text-ink-900">
        {legend}
      </legend>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id={`${idPrefix}-lat`}
            label="Latitude"
            type="number"
            step="any"
            inputMode="decimal"
            value={latText}
            onChange={(event) => setLatText(event.target.value)}
            onBlur={() => commit(latText, lonText)}
          />
        </div>
        <div className="flex-1">
          <Input
            id={`${idPrefix}-lon`}
            label="Longitude"
            type="number"
            step="any"
            inputMode="decimal"
            value={lonText}
            onChange={(event) => setLonText(event.target.value)}
            onBlur={() => commit(latText, lonText)}
          />
        </div>
      </div>
    </fieldset>
  );
}
