import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api-client';
import { ExportPdfButton } from './export-pdf-button';

const downloadMonthlyReport = vi.fn();
const downloadBlob = vi.fn();

vi.mock('../../lib/carbon-api', () => ({
  downloadMonthlyReport: (...args: unknown[]) => downloadMonthlyReport(...args),
}));

vi.mock('../../lib/download-blob', () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

describe('ExportPdfButton', () => {
  beforeEach(() => {
    downloadMonthlyReport.mockReset();
    downloadBlob.mockReset();
  });

  it('récupère le blob authentifié puis déclenche le téléchargement (§4 : pas de <a href> direct)', async () => {
    const blob = new Blob(['%PDF-'], { type: 'application/pdf' });
    downloadMonthlyReport.mockResolvedValueOnce(blob);
    const user = userEvent.setup();
    render(<ExportPdfButton month="2026-08" />);

    await user.click(screen.getByRole('button', { name: /Exporter le bilan de 2026-08/ }));

    expect(downloadMonthlyReport).toHaveBeenCalledWith('2026-08');
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'bilan-carbone-2026-08.pdf');
  });

  it("affiche une erreur et ne déclenche aucun téléchargement si l'API échoue", async () => {
    downloadMonthlyReport.mockRejectedValueOnce(new ApiError(404, 'Aucune donnée pour ce mois.'));
    const user = userEvent.setup();
    render(<ExportPdfButton month="2026-08" />);

    await user.click(screen.getByRole('button', { name: /Exporter le bilan de 2026-08/ }));

    expect(await screen.findByText('Aucune donnée pour ce mois.')).toBeInTheDocument();
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
