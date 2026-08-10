import { DegradedCacheService } from './degraded-cache.service';

function buildService(redis: {
  get: jest.Mock;
  set: jest.Mock;
}): DegradedCacheService {
  return new DegradedCacheService(redis as never);
}

describe('DegradedCacheService', () => {
  const options = { freshnessMs: 60_000, fallbackTtlSeconds: 3600 };

  it('sert la donnée en cache sans appeler la source si elle est fraîche (hit)', async () => {
    const updatedAt = new Date().toISOString();
    const redis = {
      get: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ data: { count: 5 }, updatedAt })),
      set: jest.fn(),
    };
    const service = buildService(redis);
    const fetcher = jest.fn();

    const result = await service.getOrRefresh('key', fetcher, options);

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ data: { count: 5 }, stale: false, updatedAt });
  });

  it("interroge la source et met en cache quand rien n'est en cache (miss)", async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = buildService(redis);
    const fetcher = jest.fn().mockResolvedValue({ count: 7 });

    const result = await service.getOrRefresh('key', fetcher, options);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ count: 7 });
    expect(result.stale).toBe(false);
    expect(redis.set).toHaveBeenCalledWith(
      'key',
      expect.any(String),
      'EX',
      options.fallbackTtlSeconds,
    );
  });

  it('rafraîchit la source quand la donnée en cache a dépassé la fenêtre de fraîcheur', async () => {
    const staleUpdatedAt = new Date(Date.now() - 120_000).toISOString();
    const redis = {
      get: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ data: { count: 1 }, updatedAt: staleUpdatedAt }),
        ),
      set: jest.fn(),
    };
    const service = buildService(redis);
    const fetcher = jest.fn().mockResolvedValue({ count: 2 });

    const result = await service.getOrRefresh('key', fetcher, options);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual({ count: 2 });
    expect(result.stale).toBe(false);
  });

  it('mode dégradé : sert la dernière valeur connue (stale) si la source échoue', async () => {
    const updatedAt = new Date(Date.now() - 120_000).toISOString();
    const redis = {
      get: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ data: { count: 3 }, updatedAt })),
      set: jest.fn(),
    };
    const service = buildService(redis);
    const fetcher = jest.fn().mockRejectedValue(new Error('source HS'));

    const result = await service.getOrRefresh('key', fetcher, options);

    expect(result).toEqual({ data: { count: 3 }, stale: true, updatedAt });
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("mode dégradé : renvoie une réponse vide signalée si aucune valeur n'est connue", async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = buildService(redis);
    const fetcher = jest.fn().mockRejectedValue(new Error('source HS'));

    const result = await service.getOrRefresh('key', fetcher, options);

    expect(result).toEqual({ data: null, stale: true, updatedAt: null });
  });

  it("n'échoue jamais globalement même si la source rejette (§4.6)", async () => {
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = buildService(redis);
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(
      service.getOrRefresh('key', fetcher, options),
    ).resolves.toBeDefined();
  });
});
