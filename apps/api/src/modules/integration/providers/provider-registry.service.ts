import { Inject, Injectable } from '@nestjs/common';
import { TransportMode } from '@urbanflow/shared-types';
import {
  RoutingProvider,
  SharedMobilityProvider,
  TransitProvider,
  TransportProvider,
  isRoutingProvider,
  isSharedMobilityProvider,
  isTransitProvider,
} from './provider.interfaces';
import { TRANSPORT_PROVIDERS } from './provider.tokens';

/**
 * Registre des providers de transport (§5). Expose les providers par
 * capacité (mobilité partagée / transit / routing) ou par mode, sans jamais
 * connaître de classe concrète — la liste lui est injectée par
 * `IntegrationModule`.
 */
@Injectable()
export class ProviderRegistry {
  constructor(
    @Inject(TRANSPORT_PROVIDERS)
    private readonly providers: TransportProvider[],
  ) {}

  getAll(): TransportProvider[] {
    return this.providers;
  }

  getSharedMobilityProviders(): SharedMobilityProvider[] {
    return this.providers.filter(isSharedMobilityProvider);
  }

  getTransitProviders(): TransitProvider[] {
    return this.providers.filter(isTransitProvider);
  }

  getRoutingProviders(): RoutingProvider[] {
    return this.providers.filter(isRoutingProvider);
  }

  getByMode(mode: TransportMode): TransportProvider[] {
    return this.providers.filter((provider) => provider.modes.includes(mode));
  }
}
