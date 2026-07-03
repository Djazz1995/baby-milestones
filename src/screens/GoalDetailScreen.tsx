import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';

import { BruteFlame } from '@/components/brute-logo';
import {
  Card,
  CategoryChip,
  GhostButton,
  Icon,
  PrimaryButton,
  ProgressBar,
  Sheet,
  StreakFlame,
  TextButton,
} from '@/components/kit';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { useComplete } from '@/hooks/use-complete';
import { useGoal } from '@/hooks/use-goal';
import { useRoast } from '@/hooks/use-roast';
import { useStreak } from '@/hooks/use-streak';
import { useTodayStatuses } from '@/hooks/use-today-status';
import type { ScheduleSlot } from '@/models';
import { goalService } from '@/services/goalService';
import { notificationService } from '@/services/notificationService';
import { tokens } from '@/theme/tokens';
import { formatTime, scheduleLabel } from '@/utils/goal-format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Is any reminder scheduled for today's weekday? */
function isScheduledToday(slots: ScheduleSlot[]): boolean {
  const isoToday = new Date().getDay() === 0 ? 7 : new Date().getDay();
  return slots.some((s) => s.day === isoToday);
}

/** Soonest upcoming slot from now (wraps to next week). */
function nextReminder(slots: ScheduleSlot[]): ScheduleSlot | undefined {
  if (slots.length === 0) return undefined;
  const now = new Date();
  const isoToday = now.getDay() === 0 ? 7 : now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best: ScheduleSlot | undefined;
  let bestDelta = Infinity;
  for (const s of slots) {
    const [h, m] = s.time.split(':').map(Number);
    const dayDiff = (s.day - isoToday + 7) % 7;
    let delta = dayDiff * 1440 + (h * 60 + m - nowMin);
    if (delta <= 0) delta += 7 * 1440;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s;
    }
  }
  return best;
}

type Props = { goalId: string };

export function GoalDetailScreen({ goalId }: Props) {
  const router = useRouter();
  const { data: goal, loading, error, refetch: refetchGoal } = useGoal(goalId);
  const { data: stats, refetch: refetchStats } = useStreak(goalId);
  const { data: statuses, refetch: refetchStatus } = useTodayStatuses(goal ? [goal] : []);
  const { complete, completing } = useComplete();
  const { getPartial, getWeekly } = useRoast();
  const [verdict, setVerdict] = useState<string>();
  const [amountDraft, setAmountDraft] = useState('');

  // Refresh stats/goal when returning (e.g. after a skip or edit).
  useFocusEffect(
    useCallback(() => {
      refetchGoal();
      refetchStats();
      refetchStatus();
    }, [refetchGoal, refetchStats, refetchStatus])
  );

  async function onDone() {
    const quantified = typeof goal?.targetValue === 'number';
    let amount: number | undefined;
    if (quantified) {
      const parsed = Number(amountDraft);
      if (!amountDraft.trim() || Number.isNaN(parsed) || parsed < 0) {
        Alert.alert('Enter an amount', `How many ${goal?.unit ?? 'units'} did you do?`);
        return;
      }
      amount = parsed;
    }
    try {
      await complete(goalId, 'tap', Boolean(goal?.buddyId), amount);
      // Pick the roast surface (§4.3, §4.7):
      //  - quantified partial log → mock the per-session amount ratio
      //  - weekly-frequency goal still under target after this tap → mock the
      //    days-per-week ratio ("3 of 5 this week")
      //  - otherwise → win line
      const weeklyTarget = goal?.schedule.weeklyTarget;
      const partial =
        goal && typeof amount === 'number' && typeof goal.targetValue === 'number' && amount < goal.targetValue;
      let line: string | undefined;
      if (partial) {
        line = await getPartial(goal!, amount!).catch(() => undefined);
      } else if (goal && weeklyTarget && weeklyTarget > 0) {
        // This tap counts toward the week; statuses still hold the pre-tap count.
        const doneThisWeek = (statuses[goal.id]?.progress?.done ?? 0) + 1;
        if (doneThisWeek < weeklyTarget) {
          line = await getWeekly(goal, doneThisWeek, weeklyTarget).catch(() => undefined);
        }
      }
      setVerdict(line ?? 'Logged. The couch loses this round.');
      setAmountDraft('');
      await Promise.all([refetchStats(), refetchStatus()]);
    } catch (e) {
      Alert.alert('Could not mark done', (e as Error).message);
    }
  }

  async function onTogglePause() {
    if (!goal) return;
    const updated = await goalService.setPaused(goalId, !goal.paused);
    await notificationService.scheduleForGoal(updated); // cancels when paused
    refetchGoal();
  }

  if (loading && !goal) {
    return (
      <ScreenLayout edges={['bottom']} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={tokens.muted} />
        </View>
      </ScreenLayout>
    );
  }
  if (error || !goal) {
    return (
      <ScreenLayout edges={['bottom']} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText type="body" color="muted" style={{ textAlign: 'center' }}>
            Couldn&apos;t load goal. {error?.message ?? 'not found'}
          </ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  const next = nextReminder(goal.schedule.slots);
  const scheduledToday = isScheduledToday(goal.schedule.slots);
  const today = statuses[goal.id];
  const todayStatus = today?.status;
  const quantified = typeof goal.targetValue === 'number';
  const progress = today?.progress; // weekly or specific-dates: {done,total,kind}
  const progressMet = progress ? progress.done >= progress.total : false;
  // Binary goals complete once per day; block re-tapping. Quantified goals may
  // keep logging to accumulate toward the target.
  const completedToday = todayStatus === 'done';
  const doneLocked = completedToday && !quantified;
  // Not actionable today: status 'off' (fixed not scheduled, or a date that's
  // not today) and the progress target isn't already met. Exclude paused/archived.
  const notDueToday = !progressMet && todayStatus === 'off' && !goal.paused && !goal.archived;

  const current = stats?.current ?? 0;
  const longest = stats?.longest ?? 0;
  const completionRate = stats ? Math.round(stats.completionRate7 * 100) : 0;
  const streakUnitLabel = stats?.streakUnit === 'week' ? 'week streak' : 'day streak';

  const doneCta = progressMet
    ? progress?.kind === 'dates'
      ? 'All dates done'
      : 'Done this week'
    : notDueToday
      ? 'Not due today'
      : doneLocked
        ? 'Done today'
        : 'Mark done';
  const ctaDisabled = progressMet || notDueToday || doneLocked;

  return (
    <ScreenLayout
      edges={['bottom']}
      footer={
        <View style={{ gap: 14 }}>
          <PrimaryButton
            title={doneCta}
            icon={
              ctaDisabled ? (
                <Icon name="check" size={18} color={tokens.accentText} strokeWidth={2.4} />
              ) : undefined
            }
            onPress={onDone}
            loading={completing}
            disabled={ctaDisabled}
          />
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}
          >
            <TextButton title="Edit" onPress={() => router.push(`/goal/${goalId}/edit`)} />
            <ThemedText type="label" color="muted">
              ·
            </ThemedText>
            <TextButton
              title={goal.paused ? 'Resume' : 'Pause'}
              onPress={onTogglePause}
            />
            {scheduledToday && !goal.paused ? (
              <>
                <ThemedText type="label" color="muted">
                  ·
                </ThemedText>
                <TextButton
                  title="I can't today"
                  color={tokens.danger}
                  onPress={() => router.push(`/goal/${goalId}/skip`)}
                />
              </>
            ) : null}
          </View>
        </View>
      }
    >
      <Stack.Screen options={{ title: goal.name }} />

      {/* Title + meta row */}
      <ThemedText type="heading" style={{ marginTop: 4 }}>
        {goal.name}
      </ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 10,
          marginBottom: 24,
        }}
      >
        <CategoryChip category={goal.category} />
        <ThemedText type="caption" color="muted" style={{ fontSize: 12.5 }}>
          {goal.paused ? 'Paused' : scheduleLabel(goal)}
        </ThemedText>
      </View>

      {/* Streak hero */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <BruteFlame size={52} color={current <= 0 ? tokens.off : undefined} />
        <ThemedText
          type="hero"
          color={current <= 0 ? 'muted' : 'accent1'}
          style={{ fontSize: 64 }}
        >
          {current}
        </ThemedText>
        <View style={{ flex: 1 }}>
          <ThemedText type="bodyStrong">{streakUnitLabel}</ThemedText>
          <ThemedText type="caption" color="muted">
            personal best is {longest}
          </ThemedText>
        </View>
      </View>

      {/* Stats card */}
      <Card style={{ flexDirection: 'row', padding: 0 }}>
        <StatCell label="Streak" value={`${current}`} />
        <View style={{ width: 1, backgroundColor: tokens.rim }} />
        <StatCell label="Best" value={`${longest}`} />
        <View style={{ width: 1, backgroundColor: tokens.rim }} />
        <StatCell label="Done" value={stats ? `${completionRate}%` : '—'} />
      </Card>

      {/* Week block — weekly-target goals with live progress */}
      {progress && progress.kind === 'weekly' ? (
        <Card style={{ marginTop: 12 }}>
          <ThemedText type="bodyStrong" style={{ marginBottom: 10 }}>
            {progress.done} of {progress.total} this week
          </ThemedText>
          <ProgressBar value={progress.total ? progress.done / progress.total : 0} height={6} />
        </Card>
      ) : null}

      {/* Next reminder */}
      {next ? (
        <ThemedText type="caption" color="muted" style={{ marginTop: 16, fontSize: 12.5 }}>
          {goal.paused ? 'Paused. Next would be ' : 'Next reminder. '}
          {WEEKDAYS[next.day - 1]}, {formatTime(next.time)}
        </ThemedText>
      ) : null}

      {/* Quantified amount input */}
      {quantified ? (
        <View style={{ marginTop: 20 }}>
          <ThemedText type="label" color="muted" style={{ marginBottom: 8 }}>
            How many {goal.unit ?? 'units'}? (target {goal.targetValue})
          </ThemedText>
          <TextInput
            value={amountDraft}
            onChangeText={setAmountDraft}
            placeholder={`0`}
            placeholderTextColor={tokens.muted}
            keyboardType="numeric"
            style={{
              color: tokens.fg,
              backgroundColor: tokens.surface2,
              borderWidth: 1,
              borderColor: tokens.rim,
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
            }}
          />
        </View>
      ) : null}

      {/* Delete link (kept from prior screen) */}
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={{ alignSelf: 'center', marginTop: 28, paddingVertical: 8 }}
      >
        <ThemedText type="label" style={{ color: tokens.danger, fontWeight: '600' }}>
          Delete goal
        </ThemedText>
      </Pressable>

      {/* Completion verdict */}
      <VerdictSheet
        visible={Boolean(verdict)}
        streak={current}
        verdict={verdict ?? ''}
        onShare={() =>
          router.push({
            pathname: '/share/[cardId]',
            params: {
              cardId: 'done',
              text: verdict ?? `Another one done. ${goal.name}`,
              goalName: goal.name,
            },
          })
        }
        onClose={() => setVerdict(undefined)}
      />
    </ScreenLayout>
  );

  function onDelete() {
    Alert.alert('Delete goal?', 'This removes the goal and its history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalService.remove(goalId);
            await notificationService.cancelForGoal(goalId);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', (e as Error).message);
          }
        },
      },
    ]);
  }
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18, gap: 6 }}>
      <ThemedText type="stat">{value}</ThemedText>
      <ThemedText type="caption" color="muted">
        {label}
      </ThemedText>
    </View>
  );
}

function VerdictSheet({
  visible,
  streak,
  verdict,
  onShare,
  onClose,
}: {
  visible: boolean;
  streak: number;
  verdict: string;
  onShare: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StreakFlame count={streak} size={22} textSize={22} />
      </View>
      <ThemedText type="heading" color="accent1">
        Streak {streak}
      </ThemedText>
      <ThemedText type="heading" style={{ textAlign: 'center' }}>
        {verdict}
      </ThemedText>
      <View style={{ width: '100%', gap: 12, marginTop: 4 }}>
        <PrimaryButton
          title="Share"
          icon={<Icon name="share" size={18} color={tokens.accentText} strokeWidth={2.2} />}
          onPress={onShare}
        />
        <GhostButton title="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}
