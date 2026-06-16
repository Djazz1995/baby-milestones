import { useCallback, useState } from 'react';

import { skipService } from '@/services/skipService';

/** Records a skip. Caller refetches stats on success. */
export function useSkip() {
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<Error>();

  const skip = useCallback(async (goalId: string, reason: string) => {
    setSkipping(true);
    setError(undefined);
    try {
      return await skipService.skip(goalId, reason);
    } catch (e) {
      setError(e as Error);
      throw e;
    } finally {
      setSkipping(false);
    }
  }, []);

  return { skip, skipping, error };
}
