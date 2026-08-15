import { TripController } from './trip.controller';
import { TripPlannerService } from './trip-planner.service';

describe('TripController', () => {
  it('délègue à TripPlannerService.plan avec le corps de la requête', async () => {
    const plannedResult = { journeys: [], stale: false, updatedAt: null };
    const tripPlannerService = {
      plan: jest.fn().mockResolvedValue(plannedResult),
    };
    const controller = new TripController(
      tripPlannerService as unknown as TripPlannerService,
    );
    const dto = {
      from: { latitude: 48.1173, longitude: -1.6778 },
      to: { latitude: 48.1257, longitude: -1.7075 },
    };

    const result = await controller.plan(dto);

    expect(tripPlannerService.plan).toHaveBeenCalledWith(dto);
    expect(result).toBe(plannedResult);
  });
});
