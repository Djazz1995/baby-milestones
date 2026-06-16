import { useCallback, useEffect, useState } from 'react';

import type { Buddy } from '@/models';
import { buddyService } from '@/services/buddyService';

/** Lists the user's accountability buddies (§4.6). */
export function useBuddies() {
  const [data, setData] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setData(await buddyService.list());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
