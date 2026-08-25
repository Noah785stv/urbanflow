'use client';

import type { CarbonLogPage } from '@urbanflow/shared-types';
import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { listCarbonLogs } from '../../lib/carbon-api';
import { formatCo2, formatDistance } from '../../lib/format';
import { MODE_LABELS } from '../../lib/mode-labels';
import { ERROR_TEXT_CLASS, SECONDARY_BUTTON_CLASS } from '../../lib/styles';

const PAGE_SIZE = 10;

function formatLoggedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Liste paginée des trajets confirmés (§7), avec décomposition par mode. */
export function RecentLogs() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CarbonLogPage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMessage(null);
      try {
        const result = await listCarbonLogs(page, PAGE_SIZE);
        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : 'Chargement des trajets impossible.',
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <section aria-labelledby="recent-logs-heading" className="flex flex-col gap-3">
      <h2 id="recent-logs-heading" className="text-lg font-bold text-zinc-900">
        Trajets récents
      </h2>

      {errorMessage && <p className={ERROR_TEXT_CLASS}>{errorMessage}</p>}

      {data && data.items.length === 0 && (
        <p className="text-sm text-zinc-700">Aucun trajet confirmé pour le moment.</p>
      )}

      {data && data.items.length > 0 && (
        <ol className="flex flex-col gap-3">
          {data.items.map((log) => (
            <li key={log.id} className="rounded border border-zinc-300 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-zinc-900">{formatLoggedAt(log.loggedAt)}</span>
                <span className="text-zinc-700">
                  {formatCo2(log.co2Grams)} · économie {formatCo2(log.savedGrams)}
                </span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-700">
                {log.modeBreakdown.map((entry) => (
                  <li key={entry.mode}>
                    {MODE_LABELS[entry.mode]} ({formatDistance(entry.distanceMeters)})
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {data && data.total > PAGE_SIZE && (
        <nav aria-label="Pagination des trajets récents" className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page <= 1}
            className={`${SECONDARY_BUTTON_CLASS} text-sm`}
          >
            Précédent
          </button>
          <span className="text-sm text-zinc-700">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages}
            className={`${SECONDARY_BUTTON_CLASS} text-sm`}
          >
            Suivant
          </button>
        </nav>
      )}
    </section>
  );
}
