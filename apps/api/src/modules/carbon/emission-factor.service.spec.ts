import { TransportMode } from '@urbanflow/shared-types';
import { Repository } from 'typeorm';
import { EmissionFactorService } from './emission-factor.service';
import { DEFAULT_EMISSION_FACTORS } from './emission-factors.constants';
import { EmissionFactor } from './entities/emission-factor.entity';

function factorRow(mode: TransportMode, gramsPerKm: string): EmissionFactor {
  return {
    id: 'factor-id',
    tenantId: 'tenant-id',
    mode,
    gramsPerKm,
    validFrom: '2026-01-01',
    validTo: null,
    createdAt: new Date(),
  };
}

describe('EmissionFactorService', () => {
  let queryBuilder: {
    distinctOn: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getMany: jest.Mock;
  };
  let repository: { createQueryBuilder: jest.Mock };
  let service: EmissionFactorService;

  beforeEach(() => {
    queryBuilder = {
      distinctOn: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    service = new EmissionFactorService(
      repository as unknown as Repository<EmissionFactor>,
    );
  });

  it('replie intégralement sur DEFAULT_EMISSION_FACTORS si la table est vide (§5)', async () => {
    queryBuilder.getMany.mockResolvedValue([]);

    const result = await service.getCurrentFactors();

    expect(result).toEqual(DEFAULT_EMISSION_FACTORS);
  });

  it('utilise la valeur en base pour un mode présent, et le repli pour les autres (base partielle)', async () => {
    queryBuilder.getMany.mockResolvedValue([
      factorRow(TransportMode.Bus, '150.5'),
    ]);

    const result = await service.getCurrentFactors();

    expect(result[TransportMode.Bus]).toBe(150.5);
    expect(result[TransportMode.Walk]).toBe(
      DEFAULT_EMISSION_FACTORS[TransportMode.Walk],
    );
    expect(result[TransportMode.CarSolo]).toBe(
      DEFAULT_EMISSION_FACTORS[TransportMode.CarSolo],
    );
  });

  it('convertit la colonne numeric (string pg) en nombre pour chaque mode de la base', async () => {
    queryBuilder.getMany.mockResolvedValue(
      Object.values(TransportMode).map((mode) =>
        factorRow(mode, String(DEFAULT_EMISSION_FACTORS[mode])),
      ),
    );

    const result = await service.getCurrentFactors();

    for (const mode of Object.values(TransportMode)) {
      expect(result[mode]).toBe(DEFAULT_EMISSION_FACTORS[mode]);
      expect(typeof result[mode]).toBe('number');
    }
  });
});
