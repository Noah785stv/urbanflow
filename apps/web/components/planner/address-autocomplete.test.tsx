import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddressAutocomplete } from './address-autocomplete';

const searchAddress = vi.fn();

vi.mock('../../lib/geocoding-api', () => ({
  searchAddress: (...args: unknown[]) => searchAddress(...args),
}));

const RENNES_SUGGESTION = {
  label: '1 Rue de la Gare 35000 Rennes',
  coordinates: { latitude: 48.1032, longitude: -1.6726 },
};

// Timers réels (pas `vi.useFakeTimers`) : le mélange fake-timers/`userEvent`
// bloque indéfiniment la frappe simulée dans ce projet — non résolu, pas la
// peine de le forcer pour un debounce de 300 ms, une vraie attente suffit.
function waitPastDebounce(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 350);
  });
}

describe('AddressAutocomplete', () => {
  beforeEach(() => {
    searchAddress.mockReset();
  });

  it("n'interroge pas l'API en dessous de 3 caractères (§A.2)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={onSelect} />);

    await user.type(screen.getByRole('combobox', { name: 'Origine' }), 'Re');
    await waitPastDebounce();

    expect(searchAddress).not.toHaveBeenCalled();
    // Le texte libre n'a jamais de coordonnées tant qu'aucune suggestion n'est choisie.
    expect(onSelect).toHaveBeenLastCalledWith(null, 'Re');
  });

  it('débounce la recherche (≥ 300 ms) puis affiche les suggestions', async () => {
    searchAddress.mockResolvedValueOnce([RENNES_SUGGESTION]);
    const user = userEvent.setup();
    render(<AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={vi.fn()} />);

    await user.type(screen.getByRole('combobox', { name: 'Origine' }), 'Rue');
    expect(searchAddress).not.toHaveBeenCalled();

    expect(
      await screen.findByRole('option', { name: RENNES_SUGGESTION.label }),
    ).toBeInTheDocument();
    expect(searchAddress).toHaveBeenCalledWith('Rue', expect.anything());
  }, 10000);

  it('sélection à la souris : remplit le champ et remonte les coordonnées (§A.4)', async () => {
    searchAddress.mockResolvedValueOnce([RENNES_SUGGESTION]);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={onSelect} />);

    await user.type(screen.getByRole('combobox', { name: 'Origine' }), 'Rue');
    await user.click(await screen.findByRole('option', { name: RENNES_SUGGESTION.label }));

    expect(onSelect).toHaveBeenLastCalledWith(
      RENNES_SUGGESTION.coordinates,
      RENNES_SUGGESTION.label,
    );
    expect(screen.getByRole('combobox', { name: 'Origine' })).toHaveValue(RENNES_SUGGESTION.label);
  }, 10000);

  it('navigation clavier : ArrowDown surligne, Entrée sélectionne (§A.3)', async () => {
    searchAddress.mockResolvedValueOnce([RENNES_SUGGESTION]);
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={onSelect} />);

    const input = screen.getByRole('combobox', { name: 'Origine' });
    await user.type(input, 'Rue');
    const option = await screen.findByRole('option', { name: RENNES_SUGGESTION.label });

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', option.id);

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(
      RENNES_SUGGESTION.coordinates,
      RENNES_SUGGESTION.label,
    );
  }, 10000);

  it('Échap referme la liste sans effacer le texte saisi', async () => {
    searchAddress.mockResolvedValueOnce([RENNES_SUGGESTION]);
    const user = userEvent.setup();
    render(<AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={vi.fn()} />);

    const input = screen.getByRole('combobox', { name: 'Origine' });
    await user.type(input, 'Rue');
    await screen.findByRole('option', { name: RENNES_SUGGESTION.label });

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('Rue');
  }, 10000);

  it('annonce le nombre de résultats pour les lecteurs d’écran (§A.3)', async () => {
    searchAddress.mockResolvedValueOnce([RENNES_SUGGESTION]);
    const user = userEvent.setup();
    render(<AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={vi.fn()} />);

    await user.type(screen.getByRole('combobox', { name: 'Origine' }), 'Rue');

    expect(await screen.findByText('1 résultat disponible')).toBeInTheDocument();
  }, 10000);

  it("resynchronise le texte affiché quand `addressLabel` change de l'extérieur (géoloc, clic carte)", () => {
    const { rerender } = render(
      <AddressAutocomplete id="origin" label="Origine" addressLabel="" onSelect={vi.fn()} />,
    );

    rerender(
      <AddressAutocomplete
        id="origin"
        label="Origine"
        addressLabel="48.10320, -1.67260"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Origine' })).toHaveValue('48.10320, -1.67260');
  });
});
