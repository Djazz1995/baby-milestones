import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Card,
  CategoryChip,
  ProgressBar,
  StatusBadge,
  StreakFlame,
  type GoalStatus,
} from '@/components/kit';
import type { Goal, GoalToday, TodayStatus } from '@/models';
import { scheduleLabel } from '@/utils/goal-format';

const STATUS: Record<TodayStatus, GoalStatus> = {
  done: 'done',
  skipped: 'skipped',
  pending: 'due',
  off: 'off',
};

/**
 * The goal list card (Home): name, category chip, cadence, streak flame, and a
 * status footer — plus a weekly-target progress bar when the goal has one.
 */
export function GoalCard({
  goal,
  today,
  streak,
  onPress,
}: {
  goal: Goal;
  today?: GoalToday;
  streak?: number;
  onPress?: () => void;
}) {
  const status = today ? STATUS[today.status] : 'off';
  const progress = today?.progress;

  return (
    <Card onPress={onPress} style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subheading" style={{ fontSize: 16, marginBottom: 6 }}>
            {goal.name}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CategoryChip category={goal.category} />
            <ThemedText type="caption" color="muted" style={{ fontSize: 12.5 }}>
              {goal.paused ? 'Paused' : scheduleLabel(goal)}
            </ThemedText>
          </View>
        </View>
        {streak != null ? <StreakFlame count={streak} /> : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          gap: 14,
        }}
      >
        {progress ? (
          <View style={{ flex: 1 }}>
            <ThemedText type="caption" color="muted" style={{ fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
              {progress.done} / {progress.total} this week
            </ThemedText>
            <ProgressBar value={progress.total ? progress.done / progress.total : 0} height={5} />
          </View>
        ) : null}
        <StatusBadge status={status} />
      </View>
    </Card>
  );
}
