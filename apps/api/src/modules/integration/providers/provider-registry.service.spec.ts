import { TransportMode } from '@urbanflow/shared-types';
import {
  RoutingProvider,
  SharedMobilityProvider,
  TransitProvider,
  TransportProvider,
} from './provider.interfaces';
import { ProviderRegistry } from './provider-registry.service';

const sharedMobility: SharedMobilityProvider = {
  id: 'gbfs:velostar',
  modes: [TransportMode.Bike, TransportMode.Scooter],
  isAvailable: () => Promise.resolve(true),
  syncStations: () => Promise.resolve(),
  getStationStatus: () => Promise.resolve([]),
};

const transit: TransitProvider = {
  id: 'navitia',
  modes: [TransportMode.Bus, TransportMode.Metro, TransportMode.Tram],
  isAvailable: () => Promise.resolve(true),
  getDepartures: () => Promise.resolve([]),
};

const routing: RoutingProvider = {
  id: 'navitia',
  modes: [
    TransportMode.Bus,
    TransportMode.Metro,
    TransportMode.Tram,
    TransportMode.Walk,
  ],
  isAvailable: () => Promise.resolve(true),
  getJourneys: () => Promise.resolve([]),
};

const bareProvider: TransportProvider = {
  id: 'bare',
  modes: [TransportMode.Walk],
  isAvailable: () => Promise.resolve(true),
};

describe('ProviderRegistry', () => {
  const registry = new ProviderRegistry([
    sharedMobility,
    transit,
    routing,
    bareProvider,
  ]);

  it('expose uniquement les providers de mobilité partagée', () => {
    expect(registry.getSharedMobilityProviders()).toEqual([sharedMobility]);
  });

  it('expose uniquement les providers transit', () => {
    expect(registry.getTransitProviders()).toEqual([transit]);
  });

  it('expose uniquement les providers de routing', () => {
    expect(registry.getRoutingProviders()).toEqual([routing]);
  });

  it('filtre par mode de transport', () => {
    expect(registry.getByMode(TransportMode.Bike)).toEqual([sharedMobility]);
    expect(registry.getByMode(TransportMode.Walk)).toEqual([
      routing,
      bareProvider,
    ]);
  });

  it('getAll retourne tous les providers enregistrés, quelle que soit leur capacité', () => {
    expect(registry.getAll()).toHaveLength(4);
  });

  it("un provider n'implémentant qu'une capacité n'apparaît pas dans les autres listes", () => {
    expect(registry.getTransitProviders()).not.toContain(sharedMobility);
    expect(registry.getRoutingProviders()).not.toContain(transit);
  });
});
