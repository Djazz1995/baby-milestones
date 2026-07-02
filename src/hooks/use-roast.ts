import { useCallback, useState } from 'react';

import type { Goal, RoastCard, RudenessLevel } from '@/models';
import { roastService } from '@/services/roastService';

/**
 * Thin wrapper over RoastService (§15.1 `useRoastCard`). Pulls personalized
 * lines from the cached pool — no live AI (§8.4). Each getter catches and
 * exposes loading/error so screens stay declarative.
 */
export function useRoast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  function run<T>(fn: () => Promise<T>): Promise<T> {
    setLoading(true);
    setError(undefined);
    return fn()
      .catch((e) => {
        setError(e as Error);
        throw e;
      })
      .finally(() => setLoading(false));
  }

  const getCard = useCallback((goal: Goal, wave: number): Promise<RoastCard> => {
    return run(() => roastService.getLine(goal, wave));
  }, []);

  const getSkip = useCallback((level: RudenessLevel, reason: string): Promise<string> => {
    return run(() => roastService.getSkip(level, reason));
  }, []);

  const getPartial = useCallback((goal: Goal, done: number): Promise<string> => {
    return run(() => roastService.getPartial(goal, done));
  }, []);

  const getWeekly = useCallback((goal: Goal, done: number, target: number): Promise<string> => {
    return run(() => roastService.getWeekly(goal, done, target));
  }, []);

  return { getCard, getSkip, getPartial, getWeekly, loading, error };
}
