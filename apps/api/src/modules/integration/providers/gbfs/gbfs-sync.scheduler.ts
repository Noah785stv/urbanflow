import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GbfsProvider } from './gbfs.provider';

/**
 * Synchronisation périodique de l'inventaire des stations GBFS (§4.1, §14) :
 * les informations de station changent rarement, contrairement aux
 * disponibilités (servies à la demande via le cache dégradé, §7). Fréquence
 * de 10 min : compromis raisonnable entre fraîcheur de l'inventaire et
 * charge sur les flux opérateurs — à ajuster si besoin.
 */
@Injectable()
export class GbfsSyncScheduler {
  private readonly logger = new Logger(GbfsSyncScheduler.name);

  constructor(private readonly gbfsProvider: GbfsProvider) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncStations(): Promise<void> {
    this.logger.log('Synchronisation périodique des stations GBFS...');
    await this.gbfsProvider.syncStations();
  }
}
