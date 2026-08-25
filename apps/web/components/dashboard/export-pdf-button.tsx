'use client';

import { useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { downloadMonthlyReport } from '../../lib/carbon-api';
import { downloadBlob } from '../../lib/download-blob';
import { ERROR_TEXT_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/styles';

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
      <button
        type="button"
        onClick={() => {
          void handleExport();
        }}
        disabled={status === 'pending'}
        className={`${SECONDARY_BUTTON_CLASS} text-xs`}
        aria-label={`Exporter le bilan de ${month} en PDF`}
      >
        {status === 'pending' ? 'Export…' : 'Exporter (PDF)'}
      </button>
      {status === 'error' && errorMessage && (
        <p className={`${ERROR_TEXT_CLASS} text-xs`}>{errorMessage}</p>
      )}
    </div>
  );
}
