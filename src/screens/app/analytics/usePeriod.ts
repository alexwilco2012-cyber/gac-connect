import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Period } from '../../../data/analytics';
import { DEFAULT_PERIOD, parsePeriod } from './model';

/**
 * The period lives in the address (`?period=90`), so a reload or a shared
 * link opens on the same figures. The default (30) keeps the address clean,
 * and anything we do not offer falls back to it and tidies the bar.
 */
export function usePeriod(): [Period, (p: Period) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('period');
  const period = parsePeriod(raw) ?? DEFAULT_PERIOD;

  const setPeriod = useCallback(
    (p: Period) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (p === DEFAULT_PERIOD) next.delete('period');
          else next.set('period', String(p));
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Only '?period=90' stays in the address; '?period=30' or '?period=7'
  // both show the default, so the bar is settled on what is shown.
  useEffect(() => {
    if (raw !== null && period === DEFAULT_PERIOD) setPeriod(DEFAULT_PERIOD);
  }, [raw, period, setPeriod]);

  return [period, setPeriod];
}
