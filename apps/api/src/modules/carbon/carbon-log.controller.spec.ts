import { StreamableFile } from '@nestjs/common';
import { AccessTokenPayload } from '../auth/types/access-token-payload.interface';
import { UserRole } from '../user/enums/user-role.enum';
import { CarbonLogController } from './carbon-log.controller';
import { CarbonLogService } from './carbon-log.service';

const user: AccessTokenPayload = {
  sub: 'user-id',
  tenantId: 'tenant-id',
  role: UserRole.Citizen,
};

describe('CarbonLogController', () => {
  let carbonLogService: {
    confirmTrip: jest.Mock;
    listForUser: jest.Mock;
    getSummary: jest.Mock;
    getMonthlyReport: jest.Mock;
  };
  let carbonReportService: { renderMonthlyReport: jest.Mock };
  let controller: CarbonLogController;

  beforeEach(() => {
    carbonLogService = {
      confirmTrip: jest.fn(),
      listForUser: jest.fn(),
      getSummary: jest.fn(),
      getMonthlyReport: jest.fn(),
    };
    carbonReportService = { renderMonthlyReport: jest.fn() };
    controller = new CarbonLogController(
      carbonLogService as unknown as CarbonLogService,
      carbonReportService,
    );
  });

  it('délègue la confirmation au tenant/utilisateur courant, jamais à un paramètre de route (§9)', async () => {
    const dto = { sections: [{ mode: 'bus', distanceMeters: 3000 }] };
    carbonLogService.confirmTrip.mockResolvedValue({ id: 'log-id' });

    const result = await controller.confirmTrip(user, dto as never);

    expect(carbonLogService.confirmTrip).toHaveBeenCalledWith(
      'tenant-id',
      'user-id',
      dto,
    );
    expect(result).toEqual({ id: 'log-id' });
  });

  it('délègue la liste avec pagination', async () => {
    const page = { items: [], total: 0, page: 1, limit: 20 };
    carbonLogService.listForUser.mockResolvedValue(page);

    const result = await controller.list(user, { page: 1, limit: 20 });

    expect(carbonLogService.listForUser).toHaveBeenCalledWith(
      'tenant-id',
      'user-id',
      1,
      20,
    );
    expect(result).toBe(page);
  });

  it('délègue les agrégats du tableau de bord', async () => {
    const summary = { totalCo2Grams: 0, totalSavedGrams: 0, monthly: [] };
    carbonLogService.getSummary.mockResolvedValue(summary);

    const result = await controller.summary(user);

    expect(carbonLogService.getSummary).toHaveBeenCalledWith(
      'tenant-id',
      'user-id',
    );
    expect(result).toBe(summary);
  });

  it('génère le PDF du mois demandé et l’enveloppe dans un StreamableFile', async () => {
    const monthlyReport = {
      month: '2026-08',
      co2Grams: 0,
      savedGrams: 0,
      tripCount: 0,
      modeBreakdown: [],
    };
    carbonLogService.getMonthlyReport.mockResolvedValue(monthlyReport);
    carbonReportService.renderMonthlyReport.mockResolvedValue(
      Buffer.from('%PDF'),
    );

    const result = await controller.report(user, { month: '2026-08' });

    expect(carbonLogService.getMonthlyReport).toHaveBeenCalledWith(
      'tenant-id',
      'user-id',
      '2026-08',
    );
    expect(carbonReportService.renderMonthlyReport).toHaveBeenCalledWith(
      monthlyReport,
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
