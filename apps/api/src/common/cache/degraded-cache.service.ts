import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

export interface CacheResult<T> {
  data: T | null;
  stale: boolean;
  updatedAt: string | null;
}

export interface DegradedCacheOptions {
  /** Fenêtre de fraîcheur : au-delà, on retente la source (pas une durée de vie Redis). */
  freshnessMs: number;
  /** TTL Redis réel — plus long que `freshnessMs`, sert de filet de secours en cas de panne. */
  fallbackTtlSeconds: number;
}

interface CacheEnvelope<T> {
  data: T;
  updatedAt: string;
}

/**
 * Wrapper cache Redis générique avec mode dégradé (§7, C10). Chaque appel à
 * une source externe (GBFS, OTP) passe par `getOrRefresh` :
 * - donnée fraîche en cache → servie telle quelle ;
 * - donnée absente ou périmée → tentative de rafraîchissement ; en cas
 *   d'échec, on sert la dernière valeur connue marquée `stale: true` ; à
 *   défaut de toute valeur connue, une réponse vide explicitement signalée
 *   dégradée (`data: null, stale: true`) — jamais d'échec global (§4.6).
 *
 * `freshnessMs` (fenêtre de fraîcheur, ex. ≤ 60 s pour un statut temps réel)
 * est volontairement distinct de `fallbackTtlSeconds` (durée de vie réelle en
 * Redis, plus longue) : si les deux étaient confondus, une clé expirée ne
 * pourrait plus jamais servir de filet de secours pendant une panne prolongée.
 */
@Injectable()
export class DegradedCacheService {
  private readonly logger = new Logger(DegradedCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getOrRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: DegradedCacheOptions,
  ): Promise<CacheResult<T>> {
    const cached = await this.readCache<T>(key);

    if (cached && this.isFresh(cached.updatedAt, options.freshnessMs)) {
      return { data: cached.data, stale: false, updatedAt: cached.updatedAt };
    }

    try {
      const data = await fetcher();
      const updatedAt = new Date().toISOString();
      const envelope: CacheEnvelope<T> = { data, updatedAt };
      await this.redis.set(
        key,
        JSON.stringify(envelope),
        'EX',
        options.fallbackTtlSeconds,
      );
      return { data, stale: false, updatedAt };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erreur inconnue';
      this.logger.warn(
        `Source indisponible pour "${key}" (${reason}) — mode dégradé.`,
      );

      if (cached) {
        return { data: cached.data, stale: true, updatedAt: cached.updatedAt };
      }
      return { data: null, stale: true, updatedAt: null };
    }
  }

  private isFresh(updatedAt: string, freshnessMs: number): boolean {
    return Date.now() - Date.parse(updatedAt) < freshnessMs;
  }

  private async readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
    const raw = await this.redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CacheEnvelope<T>;
  }
}
