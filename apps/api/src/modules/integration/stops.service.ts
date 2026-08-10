import { Injectable } from '@nestjs/common';
import { Departure } from '@urbanflow/shared-types';
import { ProviderRegistry } from './providers/provider-registry.service';

/** Service Stops (§8) — prochains passages, agrégés depuis tous les providers transit. */
@Injectable()
export class StopsService {
  constructor(private readonly providerRegistry: ProviderRegistry) {}

  async getDepartures(stopId: string): Promise<Departure[]> {
    const providers = this.providerRegistry.getTransitProviders();
    const results = await Promise.all(
      providers.map((provider) => provider.getDepartures(stopId)),
    );
    return results
      .flat()
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }
}
