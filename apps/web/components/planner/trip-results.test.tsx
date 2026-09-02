import type { PlannedJourney } from '@urbanflow/shared-types';
import { TransportMode } from '@urbanflow/shared-types';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TripResults } from './trip-results';

const FAST_EXPENSIVE_DIRTY: PlannedJourney = {
  departureAt: '2026-08-17T08:00:00+02:00',
  arrivalAt: '2026-08-17T08:10:00+02:00',
  durationSeconds: 600,
  sections: [{ mode: TransportMode.CarSolo, durationSeconds: 600, distanceMeters: 5000 }],
  co2Grams: 900,
  estimatedCostCents: 500,
  labels: ['fastest'],
};

const SLOW_CHEAP_GREEN: PlannedJourney = {
  departureAt: '2026-08-17T08:00:00+02:00',
  arrivalAt: '2026-08-17T09:00:00+02:00',
  durationSeconds: 3600,
  sections: [{ mode: TransportMode.Walk, durationSeconds: 3600, distanceMeters: 4800 }],
  co2Grams: 0,
  estimatedCostCents: 0,
  labels: ['greenest', 'cheapest'],
};

const MID_UNKNOWN_COST: PlannedJourney = {
  departureAt: '2026-08-17T08:00:00+02:00',
  arrivalAt: '2026-08-17T08:30:00+02:00',
  durationSeconds: 1800,
  sections: [{ mode: TransportMode.Bus, durationSeconds: 1800, distanceMeters: 6000 }],
  co2Grams: 300,
  estimatedCostCents: null,
  labels: [],
};

// Ordre volontairement mélangé : le tri par défaut (durée) doit le corriger.
const JOURNEYS = [SLOW_CHEAP_GREEN, FAST_EXPENSIVE_DIRTY, MID_UNKNOWN_COST];

/**
 * Cartes de résultat dans l'ordre d'affichage. `getAllByRole('listitem')`
 * remonterait aussi les `<li>` internes de chaque carte (la liste de
 * tronçons, elle-même un `<ol>`) -- on cible donc précisément les enfants
 * directs de la liste des itinéraires (`aria-labelledby="results-heading"`),
 * pas tous les `<li>` du document.
 */
function resultCards(): HTMLElement[] {
  const list = document.querySelector('section[aria-labelledby="results-heading"] > ol');
  return Array.from(list?.children ?? []) as HTMLElement[];
}

describe('TripResults — tri', () => {
  it('ne montre le contrôle de tri qu’à partir de 2 itinéraires', () => {
    render(
      <TripResults
        journeys={[FAST_EXPENSIVE_DIRTY]}
        stale={false}
        selectedIndex={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('trie par durée croissante par défaut', () => {
    render(
      <TripResults journeys={JOURNEYS} stale={false} selectedIndex={null} onSelect={vi.fn()} />,
    );

    const cards = resultCards();
    expect(cards[0].textContent).toContain('10 min'); // FAST_EXPENSIVE_DIRTY
    expect(cards[1].textContent).toContain('30 min'); // MID_UNKNOWN_COST
    expect(cards[2].textContent).toContain('1 h 00 min'); // SLOW_CHEAP_GREEN
  });

  it('retrie par CO2 croissant au clic sur « CO2 »', async () => {
    const user = userEvent.setup();
    render(
      <TripResults journeys={JOURNEYS} stale={false} selectedIndex={null} onSelect={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'CO₂' }));

    const cards = resultCards();
    expect(cards[0].textContent).toContain('0 g CO2e'); // SLOW_CHEAP_GREEN
    expect(cards[1].textContent).toContain('300 g CO2e'); // MID_UNKNOWN_COST
    expect(cards[2].textContent).toContain('900 g CO2e'); // FAST_EXPENSIVE_DIRTY
  });

  it('retrie par coût croissant au clic sur « Coût », coût inconnu en dernier', async () => {
    const user = userEvent.setup();
    render(
      <TripResults journeys={JOURNEYS} stale={false} selectedIndex={null} onSelect={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: 'Coût' }));

    // `toContain('0,00')` plutôt que `'0,00 €'` : `Intl.NumberFormat('fr-FR')`
    // insère une espace insécable (pas ' ') avant le symbole -- non pertinent
    // ici, seul l'ordre importe.
    const cards = resultCards();
    expect(cards[0].textContent).toContain('0,00'); // SLOW_CHEAP_GREEN
    expect(cards[1].textContent).toContain('5,00'); // FAST_EXPENSIVE_DIRTY
    expect(cards[2].textContent).toContain('estimation indisponible'); // MID_UNKNOWN_COST
  });

  it('la sélection suit le trajet, pas sa position visuelle, après un changement de tri', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(
      <TripResults journeys={JOURNEYS} stale={false} selectedIndex={null} onSelect={onSelect} />,
    );

    // Sélectionne le trajet affiché en 1ère position (tri par durée par
    // défaut) : FAST_EXPENSIVE_DIRTY, index d'origine 1 dans JOURNEYS.
    const firstCardButton = within(resultCards()[0]).getByRole('button', {
      name: 'Sélectionner',
    });
    await user.click(firstCardButton);
    expect(onSelect).toHaveBeenCalledWith(1);

    rerender(
      <TripResults journeys={JOURNEYS} stale={false} selectedIndex={1} onSelect={onSelect} />,
    );

    // Change de tri : FAST_EXPENSIVE_DIRTY passe en dernière position (tri
    // par CO2), mais reste la carte marquée « Sélectionné ».
    await user.click(screen.getByRole('button', { name: 'CO₂' }));

    const cards = resultCards();
    expect(within(cards[2]).getByRole('button', { name: '✓ Sélectionné' })).toBeInTheDocument();
    expect(cards[2].textContent).toContain('10 min');
  });
});
