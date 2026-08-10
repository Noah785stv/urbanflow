import { StopsController } from './stops.controller';
import { StopsService } from './stops.service';

describe('StopsController', () => {
  it("délègue à StopsService.getDepartures avec l'id de l'arrêt", async () => {
    const stopsService = { getDepartures: jest.fn().mockResolvedValue([]) };
    const controller = new StopsController(
      stopsService as unknown as StopsService,
    );

    await controller.getDepartures('stop_point:123');

    expect(stopsService.getDepartures).toHaveBeenCalledWith('stop_point:123');
  });
});
