'use client';

import { useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { downloadMonthlyReport } from '../../lib/carbon-api';
import { downloadBlob } from '../../lib/download-blob';
import { Button } from '../ui/button';

interface ExportPdfButtonProps {
  /** Format `YYYY-MM`. */
  month: string;
}

type ExportStatus = 'idle' | 'pending' | 'error';

/** Export PDF par mois (§7) — blob authentifié, jamais un `<a href>` direct (§4). */
export function ExportPdfButton({ month }: ExportPdfButtonProps) {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExport() {
    setStatus('pending');
    setErrorMessage(null);
    try {
      const blob = await downloadMonthlyReport(month);
      downloadBlob(blob, `bilan-carbone-${month}.pdf`);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof ApiError ? error.message : 'Export PDF impossible.');
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          void handleExport();
        }}
        disabled={status === 'pending'}
        className="text-sm"
        aria-label={`Exporter le bilan de ${month} en PDF`}
      >
        {status === 'pending' ? 'Export…' : 'Exporter (PDF)'}
      </Button>
      {status === 'error' && errorMessage && (
        <p className="text-sm font-medium text-alert-600">{errorMessage}</p>
      )}
    </div>
  );
}
