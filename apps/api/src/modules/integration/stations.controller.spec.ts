import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

describe('StationsController', () => {
  it('délègue à StationsService.findNearby avec lat/lng/radius', async () => {
    const stationsService = { findNearby: jest.fn().mockResolvedValue([]) };
    const controller = new StationsController(
      stationsService as unknown as StationsService,
    );

    await controller.findNearby({ lat: 48.1173, lng: -1.6778, radius: 500 });

    expect(stationsService.findNearby).toHaveBeenCalledWith(
      48.1173,
      -1.6778,
      500,
    );
  });
});
