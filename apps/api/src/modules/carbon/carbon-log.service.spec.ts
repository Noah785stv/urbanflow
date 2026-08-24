import { TransportMode } from '@urbanflow/shared-types';
import { Repository } from 'typeorm';
import { CarbonEstimatorService } from './carbon-estimator.service';
import { CarbonLogService } from './carbon-log.service';
import { ConfirmTripDto } from './dto/confirm-trip.dto';
import { DEFAULT_EMISSION_FACTORS } from './emission-factors.constants';
import { CarbonLog } from './entities/carbon-log.entity';

function buildEntity(overrides: Partial<CarbonLog> = {}): CarbonLog {
  return {
    id: 'log-id',
    tenantId: 'tenant-id',
    userId: 'user-id',
    loggedAt: new Date('2026-08-17T08:00:00.000Z'),
    co2Grams: 339,
    distanceMeters: 3000,
    referenceCo2Grams: 579,
    savedGrams: 240,
    modeBreakdown: [
      { mode: TransportMode.Bus, distanceMeters: 3000, co2Grams: 339 },
    ],
    createdAt: new Date('2026-08-17T08:00:00.000Z'),
    ...overrides,
  };
}

describe('CarbonLogService', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let service: CarbonLogService;

  beforeEach(() => {
    repository = {
      create: jest.fn((entity: Partial<CarbonLog>) => entity),
      save: jest.fn((entity: Partial<CarbonLog>) =>
        Promise.resolve({ createdAt: new Date(), ...entity }),
      ),
      find: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    // Estimateur réel (non modifié, §1) : le recalcul serveur doit passer par
    // la même formule pure que F2, pas par un double de test.
    const carbonEstimator = new CarbonEstimatorService(
      DEFAULT_EMISSION_FACTORS,
    );

    service = new CarbonLogService(
      repository as unknown as Repository<CarbonLog>,
      carbonEstimator,
    );
  });

  describe('confirmTrip', () => {
    it('recalcule le CO2 serveur, la référence voiture solo et l’économie (§6)', async () => {
      const dto: ConfirmTripDto = {
        sections: [{ mode: TransportMode.Bus, distanceMeters: 3000 }],
      };
      repository.save.mockImplementation((entity) =>
        Promise.resolve({ ...buildEntity(), ...entity }),
      );

      const result = await service.confirmTrip('tenant-id', 'user-id', dto);

      // Bus 3 km * 113 = 339 ; référence voiture solo 3 km * 193 = 579 ; économie 240.
      expect(result.co2Grams).toBe(339);
      expect(result.distanceMeters).toBe(3000);
      expect(result.referenceCo2Grams).toBe(579);
      expect(result.savedGrams).toBe(240);
      expect(result.modeBreakdown).toEqual([
        { mode: TransportMode.Bus, distanceMeters: 3000, co2Grams: 339 },
      ]);
    });

    it('ignore toute empreinte envoyée par le client : seul { mode, distanceMeters } est lu (§6)', async () => {
      const dtoWithSpoofedCo2 = {
        sections: [{ mode: TransportMode.Bus, distanceMeters: 3000 }],
        co2Grams: 1, // jamais présent sur ConfirmTripDto ; simule un payload trafiqué
      } as unknown as ConfirmTripDto;

      const result = await service.confirmTrip(
        'tenant-id',
        'user-id',
        dtoWithSpoofedCo2,
      );

      expect(result.co2Grams).toBe(339);
    });

    it('regroupe les tronçons par mode avant de calculer la décomposition (plusieurs tronçons du même mode)', async () => {
      const dto: ConfirmTripDto = {
        sections: [
          { mode: TransportMode.Walk, distanceMeters: 300 },
          { mode: TransportMode.Bus, distanceMeters: 2000 },
          { mode: TransportMode.Walk, distanceMeters: 200 },
        ],
      };

      const result = await service.confirmTrip('tenant-id', 'user-id', dto);

      expect(result.modeBreakdown).toHaveLength(2);
      const walkEntry = result.modeBreakdown.find(
        (e) => e.mode === TransportMode.Walk,
      );
      expect(walkEntry?.distanceMeters).toBe(500);
      expect(walkEntry?.co2Grams).toBe(0);
      const busEntry = result.modeBreakdown.find(
        (e) => e.mode === TransportMode.Bus,
      );
      // 2 km * 113 = 226
      expect(busEntry?.co2Grams).toBe(226);
      expect(result.distanceMeters).toBe(2500);
    });

    it('horodate au moment de la confirmation quand `loggedAt` est omis', async () => {
      const before = Date.now();

      const result = await service.confirmTrip('tenant-id', 'user-id', {
        sections: [{ mode: TransportMode.Walk, distanceMeters: 500 }],
      });

      expect(new Date(result.loggedAt).getTime()).toBeGreaterThanOrEqual(
        before,
      );
    });

    it('utilise `loggedAt` quand il est fourni (trajet confirmé après coup)', async () => {
      const result = await service.confirmTrip('tenant-id', 'user-id', {
        loggedAt: '2026-08-10T07:30:00.000Z',
        sections: [{ mode: TransportMode.Walk, distanceMeters: 500 }],
      });

      expect(result.loggedAt).toBe('2026-08-10T07:30:00.000Z');
    });
  });

  describe('listForUser', () => {
    it('pagine (skip/take) et trie par date décroissante', async () => {
      repository.findAndCount.mockResolvedValue([[buildEntity()], 1]);

      const result = await service.listForUser('tenant-id', 'user-id', 2, 10);

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { loggedAt: 'DESC' },
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({
        items: [expect.objectContaining({ id: 'log-id' })],
        total: 1,
        page: 2,
        limit: 10,
      });
    });

    it('scope la requête au tenant et à l’utilisateur courants', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.listForUser('tenant-id', 'user-id', 1, 20);

      const [call] = repository.findAndCount.mock.calls[0] as [
        { where: { tenantId: string; userId: string } },
      ];
      expect(call.where.tenantId).toBe('tenant-id');
      expect(call.where.userId).toBe('user-id');
    });
  });

  describe('getSummary', () => {
    it('agrège les totaux et la décomposition mensuelle', async () => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            month: '2026-07',
            co2Grams: '500',
            savedGrams: '100',
            tripCount: '2',
          },
          {
            month: '2026-08',
            co2Grams: '339',
            savedGrams: '240',
            tripCount: '1',
          },
        ]),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getSummary('tenant-id', 'user-id');

      expect(result).toEqual({
        totalCo2Grams: 839,
        totalSavedGrams: 340,
        monthly: [
          { month: '2026-07', co2Grams: 500, savedGrams: 100, tripCount: 2 },
          { month: '2026-08', co2Grams: 339, savedGrams: 240, tripCount: 1 },
        ],
      });
    });
  });

  describe('deleteAllForUser', () => {
    it('supprime tous les logs du tenant/utilisateur (F1 §9, suppression de compte)', async () => {
      await service.deleteAllForUser('tenant-id', 'user-id');

      expect(repository.delete).toHaveBeenCalledWith({
        tenantId: 'tenant-id',
        userId: 'user-id',
      });
    });
  });

  describe('getMonthlyReport', () => {
    it('fusionne la décomposition par mode de plusieurs logs du même mois', async () => {
      repository.find.mockResolvedValue([
        buildEntity({
          co2Grams: 339,
          savedGrams: 240,
          modeBreakdown: [
            { mode: TransportMode.Bus, distanceMeters: 3000, co2Grams: 339 },
          ],
        }),
        buildEntity({
          co2Grams: 0,
          savedGrams: 193,
          modeBreakdown: [
            { mode: TransportMode.Walk, distanceMeters: 500, co2Grams: 0 },
          ],
        }),
        buildEntity({
          co2Grams: 113,
          savedGrams: 80,
          modeBreakdown: [
            { mode: TransportMode.Bus, distanceMeters: 1000, co2Grams: 113 },
          ],
        }),
      ]);

      const result = await service.getMonthlyReport(
        'tenant-id',
        'user-id',
        '2026-08',
      );

      expect(result.month).toBe('2026-08');
      expect(result.tripCount).toBe(3);
      expect(result.co2Grams).toBe(452);
      expect(result.savedGrams).toBe(513);
      expect(result.modeBreakdown).toEqual(
        expect.arrayContaining([
          { mode: TransportMode.Bus, distanceMeters: 4000, co2Grams: 452 },
          { mode: TransportMode.Walk, distanceMeters: 500, co2Grams: 0 },
        ]),
      );
    });

    it('renvoie des agrégats vides pour un mois sans trajet confirmé', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.getMonthlyReport(
        'tenant-id',
        'user-id',
        '2026-08',
      );

      expect(result).toEqual({
        month: '2026-08',
        co2Grams: 0,
        savedGrams: 0,
        tripCount: 0,
        modeBreakdown: [],
      });
    });
  });
});
