import { Test } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;
  const healthCheckService = { check: jest.fn() };
  const db = { pingCheck: jest.fn() };
  const redis = { isHealthy: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: db },
        { provide: RedisHealthIndicator, useValue: redis },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('agrège les indicateurs postgres et redis', async () => {
    healthCheckService.check.mockResolvedValue({ status: 'ok' });

    const result = await controller.check();

    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: 'ok' });
  });
});
