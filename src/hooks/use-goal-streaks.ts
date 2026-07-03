import { useCallback, useEffect, useState } from 'react';

import type { Goal } from '@/models';
import { completionService } from '@/services/completionService';

/**
 * Current-streak count per goal, for the streak flames on list cards. Batches
 * `completionService.getStats` across the (MVP-capped) goal list. Returns a
 * `goalId → current` map; goals still loading are simply absent.
 */
export function useGoalStreaks(goals: Goal[]) {
  const [data, setData] = useState<Record<string, number>>({});
  const ids = goals.map((g) => g.id).join(',');

  const refetch = useCallback(async () => {
    if (goals.length === 0) {
      setData({});
      return;
    }
    const entries = await Promise.all(
      goals.map(async (g) => {
        try {
          const stats = await completionService.getStats(g.id);
          return [g.id, stats.current] as const;
        } catch {
          return [g.id, 0] as const;
        }
      }),
    );
    setData(Object.fromEntries(entries));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, refetch };
}
