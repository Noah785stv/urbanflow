'use client';

import type { Coordinates } from '@urbanflow/shared-types';
import { useEffect, useRef, useState } from 'react';
import { searchAddress, type AddressSuggestion } from '../../lib/geocoding-api';
import { Input } from '../ui/input';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

interface AddressAutocompleteProps {
  id: string;
  label: string;
  /** Adresse affichée, pilotée par le parent (sélection, géoloc, clic carte). */
  addressLabel: string;
  /** `coordinates` vaut `null` tant que le texte affiché ne correspond pas à une suggestion choisie. */
  onSelect: (coordinates: Coordinates | null, label: string) => void;
  /** Déclenché à chaque prise de focus du champ (§C5 : sert de signal « la carte va être utile »). */
  onFocus?: () => void;
}

function resultsAnnouncement(status: 'idle' | 'loading' | 'error', count: number): string {
  if (status === 'loading') {
    return 'Recherche en cours…';
  }
  if (status === 'error') {
    return '';
  }
  if (count === 0) {
    return '';
  }
  return count === 1 ? '1 résultat disponible' : `${count} résultats disponibles`;
}

/**
 * Saisie d'adresse avec autocomplétion (§A.3 web-geocoding-and-pages.md) —
 * pattern ARIA combobox : le focus DOM reste sur le champ texte tout du
 * long, l'option survolée/naviguée au clavier est seulement signalée via
 * `aria-activedescendant` (jamais un déplacement de focus réel, qui
 * casserait la frappe). Affiche une adresse, mais ne remonte au parent des
 * coordonnées valides que pour une suggestion réellement sélectionnée — un
 * texte libre non résolu invalide la sélection précédente (§A.4).
 */
export function AddressAutocomplete({
  id,
  label,
  addressLabel,
  onSelect,
  onFocus,
}: AddressAutocompleteProps) {
  const [text, setText] = useState(addressLabel);
  const [previousAddressLabel, setPreviousAddressLabel] = useState(addressLabel);
  // Resynchronise l'affichage quand `addressLabel` change de l'extérieur
  // (géoloc, clic carte) — ajustement pendant le rendu, même pattern que
  // `CoordinateFields`, pas un effet, pour éviter un flash de texte périmé.
  if (addressLabel !== previousAddressLabel) {
    setPreviousAddressLabel(addressLabel);
    setText(addressLabel);
  }

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listboxId = `${id}-listbox`;

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortRef.current?.abort();
    },
    [],
  );

  function runSearch(query: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');

    searchAddress(query, controller.signal)
      .then((results) => {
        setSuggestions(results);
        setActiveIndex(null);
        setIsOpen(true);
        setStatus('idle');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setSuggestions([]);
        setIsOpen(false);
        setStatus('error');
      });
  }

  function handleTextChange(nextText: string) {
    setText(nextText);
    onSelect(null, nextText);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = nextText.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      setSuggestions([]);
      setIsOpen(false);
      setStatus('idle');
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
  }

  function commitSelection(suggestion: AddressSuggestion) {
    setText(suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(null);
    onSelect(suggestion.coordinates, suggestion.label);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        current === null ? 0 : Math.min(current + 1, suggestions.length - 1),
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        current === null ? suggestions.length - 1 : Math.max(current - 1, 0),
      );
    } else if (event.key === 'Enter') {
      if (activeIndex !== null) {
        event.preventDefault();
        commitSelection(suggestions[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(null);
    }
  }

  const activeOptionId = activeIndex !== null ? `${id}-option-${activeIndex}` : undefined;

  return (
    <div className="relative flex flex-col gap-1">
      <Input
        id={id}
        label={label}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        autoComplete="off"
        value={text}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setIsOpen(false)}
        onFocus={() => {
          onFocus?.();
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        error={status === 'error' ? "Recherche d'adresse indisponible." : undefined}
      />
      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`Suggestions pour ${label}`}
          className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-control border border-line-200 bg-surface-0 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.label}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-4 py-3 text-ink-900 ${
                index === activeIndex ? 'bg-brand-blue-50' : ''
              }`}
              // `onMouseDown` + `preventDefault` : évite que le blur du champ
              // (déclenché avant le `click`) ne ferme la liste avant que la
              // sélection ne s'exécute — piège classique du pattern combobox.
              onMouseDown={(event) => {
                event.preventDefault();
                commitSelection(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {suggestion.label}
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {resultsAnnouncement(status, suggestions.length)}
      </p>
    </div>
  );
}
