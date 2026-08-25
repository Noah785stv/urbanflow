'use client';

import type { CarbonLogSummary } from '@urbanflow/shared-types';
import { useEffect, useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { getCarbonLogSummary } from '../../lib/carbon-api';
import { MonthlyChart } from './monthly-chart';
import { RecentLogs } from './recent-logs';
import { SummaryCards } from './summary-cards';

type Status = 'loading' | 'ready' | 'error';

function announcementFor(status: Status): string {
  if (status === 'loading') {
    return 'Chargement du tableau de bord…';
  }
  if (status === 'error') {
    return 'Le tableau de bord carbone est temporairement indisponible.';
  }
  return 'Tableau de bord carbone chargé.';
}

/** Tableau de bord carbone (§7) : résumé, graphe mensuel + table, trajets récents. */
export function CarbonDashboard() {
  const [status, setStatus] = useState<Status>('loading');
  const [summary, setSummary] = useState<CarbonLogSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getCarbonLogSummary();
        if (!cancelled) {
          setSummary(result);
          setStatus('ready');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : 'Chargement du résumé impossible.',
          );
          setStatus('error');
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-[26px] font-semibold leading-[31px] text-ink-900">Empreinte carbone</h1>

      <p role="status" className="sr-only">
        {announcementFor(status)}
      </p>

      {status === 'loading' && <p className="text-sm text-ink-600">Chargement…</p>}

      {status === 'error' && errorMessage && (
        <p className="text-sm font-medium text-alert-600">{errorMessage}</p>
      )}

      {status === 'ready' && summary && (
        <>
          <SummaryCards summary={summary} />

          <section aria-labelledby="monthly-chart-heading" className="flex flex-col gap-3">
            <h2
              id="monthly-chart-heading"
              className="text-[20px] font-semibold leading-[26px] text-ink-900"
            >
              Historique mensuel
            </h2>
            <MonthlyChart monthly={summary.monthly} />
          </section>

          <RecentLogs />
        </>
      )}
    </div>
  );
}
