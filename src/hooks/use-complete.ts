import { useCallback, useState } from 'react';

import type { CompletionSource } from '@/models';
import { completionService } from '@/services/completionService';

/** Marks a goal done. Caller refetches stats/list on success. */
export function useComplete() {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<Error>();

  const complete = useCallback(
    async (goalId: string, source: CompletionSource = 'tap', witnessed = false) => {
      setCompleting(true);
      setError(undefined);
      try {
        return await completionService.complete(goalId, source, witnessed);
      } catch (e) {
        setError(e as Error);
        throw e;
      } finally {
        setCompleting(false);
      }
    },
    []
  );

  return { complete, completing, error };
}
