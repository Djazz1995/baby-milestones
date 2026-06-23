import { useCallback, useEffect, useState } from 'react';

import type { Goal, GoalToday } from '@/models';
import { statusService } from '@/services/statusService';

/** Today's snapshot (status + weekly progress) for a list of goals (§4.7). */
export function useTodayStatuses(goals: Goal[]) {
  const [data, setData] = useState<Record<string, GoalToday>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const ids = goals.map((g) => g.id).join(',');

  const refetch = useCallback(async () => {
    if (goals.length === 0) {
      setData({});
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setData(await statusService.getTodayStatuses(goals));
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
    // Re-run when the set of goal ids changes (not on every array identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
