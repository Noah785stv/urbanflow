import { RedisLifecycleService } from './redis-lifecycle.service';

describe('RedisLifecycleService', () => {
  it('ferme la connexion Redis à onModuleDestroy (évite les handles ouverts)', async () => {
    const redis = { quit: jest.fn().mockResolvedValue('OK') };
    const service = new RedisLifecycleService(redis as never);

    await service.onModuleDestroy();

    expect(redis.quit).toHaveBeenCalled();
  });
});
