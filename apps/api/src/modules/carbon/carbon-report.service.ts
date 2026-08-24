import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { MonthlyReport } from './types/monthly-report.interface';

const MODE_LABELS: Record<string, string> = {
  walk: 'Marche',
  bike: 'Vélo',
  electric_bike: 'Vélo électrique',
  scooter: 'Trottinette',
  metro: 'Métro',
  tram: 'Tramway',
  bus: 'Bus',
  regional_train: 'TER',
  car_solo: 'Voiture (solo)',
  carpool: 'Covoiturage',
};

function formatKg(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}

/**
 * Génère le bilan carbone mensuel en PDF (F4 §8, phaseable). Rendu simple et
 * lisible plutôt que soigné — la mise en forme n'est pas l'objet de F4.
 */
@Injectable()
export class CarbonReportService {
  renderMonthlyReport(report: MonthlyReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(18)
        .text(`Bilan carbone — ${report.month}`, { align: 'left' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Trajets confirmés : ${report.tripCount}`);
      doc.text(`Empreinte totale : ${formatKg(report.co2Grams)} CO2e`);
      doc.text(
        `Économie vs voiture solo : ${formatKg(report.savedGrams)} CO2e`,
      );
      doc.moveDown();

      doc.fontSize(14).text('Décomposition par mode');
      doc.fontSize(12);
      if (report.modeBreakdown.length === 0) {
        doc.text('Aucun trajet confirmé ce mois-ci.');
      }
      for (const entry of report.modeBreakdown) {
        const label = MODE_LABELS[entry.mode] ?? entry.mode;
        doc.text(
          `${label} — ${(entry.distanceMeters / 1000).toFixed(1)} km — ${formatKg(entry.co2Grams)} CO2e`,
        );
      }

      doc.end();
    });
  }
}
