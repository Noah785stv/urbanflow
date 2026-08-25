import type { MonthlyCarbonBreakdown } from '@urbanflow/shared-types';
import { formatCo2 } from '../../lib/format';
import { ExportPdfButton } from './export-pdf-button';

interface MonthlyChartProps {
  monthly: MonthlyCarbonBreakdown[];
}

const CHART_HEIGHT = 160;
const BAR_WIDTH = 14;
const BAR_GAP = 6;
const GROUP_GAP = 20;

// Attributs SVG bruts : pas de classe Tailwind possible, valeurs alignées à
// la main sur les tokens. Vert 400 (#3FA37C) est explicitement "Graphes"
// (design-system.md §1) ; le CO2 émis n'a pas de couleur assignée dans la
// doc, ink-600 (#4A5560) reste neutre plutôt que d'en inventer une.
const CO2_BAR_COLOR = '#4A5560';
const SAVED_BAR_COLOR = '#3FA37C';
const AXIS_LABEL_COLOR = '#4A5560';

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split('-');
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
}

/**
 * Graphe mensuel (§7-8). Le SVG est purement décoratif (`aria-hidden`) : la
 * table juste en dessous porte les mêmes données de façon toujours visible
 * et nativement accessible — jamais une alternative masquée. Pas d'animation
 * (rien à désactiver pour `prefers-reduced-motion`, §8).
 */
export function MonthlyChart({ monthly }: MonthlyChartProps) {
  if (monthly.length === 0) {
    return (
      <p className="text-sm text-ink-600">
        Aucune donnée mensuelle pour le moment — confirmez un trajet pour voir apparaître votre
        historique.
      </p>
    );
  }

  const maxValue = Math.max(1, ...monthly.flatMap((m) => [m.co2Grams, m.savedGrams]));
  const groupWidth = BAR_WIDTH * 2 + BAR_GAP;
  const chartWidth = monthly.length * (groupWidth + GROUP_GAP);

  return (
    <div className="flex flex-col gap-4">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT + 24}`}
        className="h-40 w-full"
        preserveAspectRatio="xMinYMax meet"
      >
        {monthly.map((month, index) => {
          const groupX = index * (groupWidth + GROUP_GAP);
          const co2Height = (month.co2Grams / maxValue) * CHART_HEIGHT;
          const savedHeight = (month.savedGrams / maxValue) * CHART_HEIGHT;
          return (
            <g key={month.month}>
              <rect
                x={groupX}
                y={CHART_HEIGHT - co2Height}
                width={BAR_WIDTH}
                height={co2Height}
                fill={CO2_BAR_COLOR}
              />
              <rect
                x={groupX + BAR_WIDTH + BAR_GAP}
                y={CHART_HEIGHT - savedHeight}
                width={BAR_WIDTH}
                height={savedHeight}
                fill={SAVED_BAR_COLOR}
              />
              <text
                x={groupX + BAR_WIDTH}
                y={CHART_HEIGHT + 16}
                fontSize="10"
                textAnchor="middle"
                fill={AXIS_LABEL_COLOR}
              >
                {monthLabel(month.month)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex gap-4 text-sm text-ink-600">
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-ink-600" />
          CO₂ émis
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-brand-green-400" />
          Économisé vs voiture solo
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold text-ink-900">
            Détail mensuel (alternative textuelle au graphe)
          </caption>
          <thead>
            <tr className="border-b border-line-200 text-ink-600">
              <th scope="col" className="py-1 pr-4">
                Mois
              </th>
              <th scope="col" className="py-1 pr-4">
                CO₂ émis
              </th>
              <th scope="col" className="py-1 pr-4">
                Économisé
              </th>
              <th scope="col" className="py-1 pr-4">
                Trajets
              </th>
              <th scope="col" className="py-1">
                Bilan PDF
              </th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((month) => (
              <tr key={month.month} className="border-b border-line-200">
                <td className="py-1 pr-4">{monthLabel(month.month)}</td>
                <td className="py-1 pr-4 font-mono">{formatCo2(month.co2Grams)}</td>
                <td className="py-1 pr-4 font-mono">{formatCo2(month.savedGrams)}</td>
                <td className="py-1 pr-4 font-mono">{month.tripCount}</td>
                <td className="py-1">
                  <ExportPdfButton month={month.month} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
