import type { StationNearbyResult } from '@urbanflow/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NearbyStations } from './nearby-stations';

const STATION_WITH_STATUS: StationNearbyResult = {
  station: {
    id: 'station-mairie',
    provider: 'star-le-velo-star',
    externalId: 'ext-mairie',
    name: 'Mairie',
    stationType: 'dock',
    location: { latitude: 48.1173, longitude: -1.6778 },
    capacity: 20,
  },
  distanceMeters: 120,
  status: {
    provider: 'star-le-velo-star',
    externalId: 'ext-mairie',
    bikesAvailable: 4,
    docksAvailable: 16,
    updatedAt: '2026-08-31T10:00:00.000Z',
    stale: false,
  },
};

const STATION_WITHOUT_STATUS: StationNearbyResult = {
  station: {
    id: 'station-gare',
    provider: 'star-le-velo-star',
    externalId: 'ext-gare',
    name: 'Gare de Rennes',
    stationType: 'dock',
    location: { latitude: 48.1032, longitude: -1.6726 },
    capacity: 30,
  },
  distanceMeters: 850,
  status: null,
};

describe('NearbyStations', () => {
  it('affiche uniquement le bouton (masqué) tant que la recherche n’est pas activée', () => {
    render(<NearbyStations enabled={false} status="idle" stations={[]} onToggle={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: 'Afficher les stations à proximité' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Mairie')).not.toBeInTheDocument();
  });

  it('appelle `onToggle` au clic comme au clavier', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<NearbyStations enabled={false} status="idle" stations={[]} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Afficher les stations à proximité' });
    await user.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('affiche un état de chargement pendant la recherche', () => {
    render(<NearbyStations enabled status="loading" stations={[]} onToggle={vi.fn()} />);
    expect(screen.getByText('Recherche en cours…')).toBeInTheDocument();
  });

  it('affiche un message explicite en cas d’erreur', () => {
    render(<NearbyStations enabled status="error" stations={[]} onToggle={vi.fn()} />);
    expect(
      screen.getByText('Recherche des stations impossible pour le moment.'),
    ).toBeInTheDocument();
  });

  it('affiche un message explicite quand aucune station n’est trouvée', () => {
    render(<NearbyStations enabled status="idle" stations={[]} onToggle={vi.fn()} />);
    // Le message apparaît deux fois à dessein : dans la région live (§9,
    // annonce lecteur d'écran) et dans le contenu visible.
    expect(
      screen.getAllByText('Aucune station de mobilité partagée trouvée à proximité.'),
    ).toHaveLength(2);
  });

  it('affiche la liste des stations, distance et disponibilité — `status: null` géré sans planter', () => {
    render(
      <NearbyStations
        enabled
        status="idle"
        stations={[STATION_WITH_STATUS, STATION_WITHOUT_STATUS]}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('Mairie')).toBeInTheDocument();
    expect(screen.getByText('120 m')).toBeInTheDocument();
    expect(screen.getByText('4 vélos disponibles · 16 places')).toBeInTheDocument();

    expect(screen.getByText('Gare de Rennes')).toBeInTheDocument();
    expect(screen.getByText('850 m')).toBeInTheDocument();
    expect(screen.getByText('Disponibilité indisponible.')).toBeInTheDocument();
  });

  it('signale les stations trouvées via la région live (§9, sans dépendre de la couleur/carte)', () => {
    render(
      <NearbyStations
        enabled
        status="idle"
        stations={[STATION_WITH_STATUS, STATION_WITHOUT_STATUS]}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      '2 stations de mobilité partagée trouvées à proximité.',
    );
  });
});
