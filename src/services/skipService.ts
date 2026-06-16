/** Skip logging. AGENTS.md §4.5, §15.3. */

import { getUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Skip } from '@/models';

type SkipRow = {
  id: string;
  goal_id: string;
  user_id: string;
  ts: string;
  reason: string;
};

function mapSkip(row: SkipRow): Skip {
  return { id: row.id, goalId: row.goal_id, timestamp: row.ts, reason: row.reason };
}

export const skipService = {
  async skip(goalId: string, reason: string): Promise<Skip> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not signed in.');
    const { data, error } = await supabase
      .from('skips')
      .insert({ goal_id: goalId, user_id: userId, reason })
      .select()
      .single();
    if (error) throw error;
    return mapSkip(data as SkipRow);
  },
};
