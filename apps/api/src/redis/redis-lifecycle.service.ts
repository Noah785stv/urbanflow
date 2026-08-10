import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Ferme proprement la connexion Redis à l'arrêt de l'application (12-Factor
 * — arrêt propre). Sans ce hook, le client `ioredis` maintient un socket TCP
 * ouvert après `app.close()`, ce qui empêche Node/Jest de terminer.
 */
@Injectable()
export class RedisLifecycleService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
