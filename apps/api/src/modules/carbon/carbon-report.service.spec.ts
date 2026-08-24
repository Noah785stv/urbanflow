import { TransportMode } from '@urbanflow/shared-types';
import { CarbonReportService } from './carbon-report.service';
import { MonthlyReport } from './types/monthly-report.interface';

describe('CarbonReportService', () => {
  const service = new CarbonReportService();

  it('génère un PDF valide (en-tête %PDF) pour un mois avec des trajets (§8)', async () => {
    const report: MonthlyReport = {
      month: '2026-08',
      co2Grams: 339,
      savedGrams: 240,
      tripCount: 1,
      modeBreakdown: [
        { mode: TransportMode.Bus, distanceMeters: 3000, co2Grams: 339 },
      ],
    };

    const pdf = await service.renderMonthlyReport(report);

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('ne plante pas pour un mois sans aucun trajet confirmé', async () => {
    const report: MonthlyReport = {
      month: '2026-08',
      co2Grams: 0,
      savedGrams: 0,
      tripCount: 0,
      modeBreakdown: [],
    };

    const pdf = await service.renderMonthlyReport(report);

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
