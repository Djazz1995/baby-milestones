/** Local notification scheduling per goal + tap routing. AGENTS.md §4.2, §15.3.
 *
 *  v1 schedules Wave-1 reminders locally at each goal's scheduled slot times,
 *  with body copy pulled from the Phase 6 cached roast pool (RoastService —
 *  pool read + string interp, NO live AI §8.4). Conditional escalation (Wave 2+
 *  only if ignored) and weekly-target/digest nudges are server-driven (§8.2) —
 *  see the Edge Function scaffold. */

import { Platform } from 'react-native';

import {
  cancel,
  ensurePermissions,
  getAllScheduled,
  scheduleWeekly,
  setupAndroidChannel,
  type NotifData,
} from '@/lib/notifications';
import type { Goal } from '@/models';
import { roastService } from '@/services/roastService';

/** Local notifications are native-only; no-op on web. */
const SUPPORTED = Platform.OS !== 'web';

/** Wave-1 copy from the cached pool; neutral fallback if the pool is unreachable. */
async function wave1Body(goal: Goal): Promise<string> {
  try {
    return await roastService.lineText(goal, 1);
  } catch {
    return goal.cue ? `${goal.cue}.` : `${goal.name}. Time to go.`;
  }
}

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

export const notificationService = {
  async init(): Promise<boolean> {
    if (!SUPPORTED) return false;
    await setupAndroidChannel();
    return ensurePermissions();
  },

  /** (Re)schedule all of a goal's Wave-1 reminders. Cancels its old ones first. */
  async scheduleForGoal(goal: Goal): Promise<void> {
    if (!SUPPORTED) return;
    await this.cancelForGoal(goal.id);
    if (goal.paused || goal.archived) return;

    const body = await wave1Body(goal);
    for (const slot of goal.schedule.slots) {
      const { hour, minute } = parseTime(slot.time);
      const data: NotifData = {
        goalId: goal.id,
        wave: 1,
        deepLink: `/goal/${goal.id}`,
      };
      await scheduleWeekly({
        isoDay: slot.day,
        hour,
        minute,
        title: 'RoastMode',
        body,
        data,
      });
    }
  },

  /** Cancel every scheduled notification belonging to a goal. */
  async cancelForGoal(goalId: string): Promise<void> {
    if (!SUPPORTED) return;
    const all = await getAllScheduled();
    await Promise.all(
      all
        .filter((req) => {
          const data = req.content.data as Partial<NotifData> | undefined;
          return data?.goalId === goalId;
        })
        .map((req) => cancel(req.identifier))
    );
  },

  /** Re-sync scheduling for the full goal set (e.g. on app start). */
  async rescheduleAll(goals: Goal[]): Promise<void> {
    for (const goal of goals) await this.scheduleForGoal(goal);
  },

  /** Resolve a notification tap to an in-app route. */
  routeForTap(data: NotifData): string {
    return data.deepLink;
  },
};
