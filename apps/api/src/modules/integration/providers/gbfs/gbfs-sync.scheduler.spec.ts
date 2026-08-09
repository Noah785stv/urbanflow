import { GbfsProvider } from './gbfs.provider';
import { GbfsSyncScheduler } from './gbfs-sync.scheduler';

describe('GbfsSyncScheduler', () => {
  it('délègue la synchronisation périodique à GbfsProvider.syncStations', async () => {
    const gbfsProvider = {
      syncStations: jest.fn().mockResolvedValue(undefined),
    };
    const scheduler = new GbfsSyncScheduler(
      gbfsProvider as unknown as GbfsProvider,
    );

    await scheduler.syncStations();

    expect(gbfsProvider.syncStations).toHaveBeenCalledTimes(1);
  });
});
