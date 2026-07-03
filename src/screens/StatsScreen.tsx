import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BruteFlame } from '@/components/brute-logo';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import {
  AppHeader,
  Card,
  ConsistencyGrid,
  Icon,
  SectionHeader,
  StreakFlame,
  type CellState,
  type GridRow,
} from '@/components/kit';
import { useGoals } from '@/hooks/use-goals';
import { useWeekOverview } from '@/hooks/use-week-overview';
import { tokens } from '@/theme/tokens';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}
function sameWeek(a: Date, b: Date): boolean {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime();
}
/** "Jun 16 – 22" / "Jun 30 – Jul 6" for the week containing `ref`. */
function weekLabel(ref: Date): string {
  const s = startOfWeek(ref);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  const left = `${MONTHS[s.getMonth()]} ${s.getDate()}`;
  const right = s.getMonth() === e.getMonth() ? `${e.getDate()}` : `${MONTHS[e.getMonth()]} ${e.getDate()}`;
  return `${left} – ${right}`;
}

/** This-week completion rate from the aggregate day grid: done / due. */
function weekRate(grid: { done: number; due: number }[]): number | null {
  const due = grid.reduce((n, d) => n + d.due, 0);
  if (due === 0) return null;
  const done = grid.reduce((n, d) => n + Math.min(d.done, d.due), 0);
  return Math.round((done / due) * 100);
}

export function StatsScreen() {
  const { data: goals, refetch } = useGoals();
  const [weekRef, setWeekRef] = useState(() => new Date());
  const [showHelp, setShowHelp] = useState(false);
  const { data, refetch: refetchOverview } = useWeekOverview(goals, weekRef);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchOverview();
    }, [refetch, refetchOverview])
  );

  const stepWeek = (delta: number) =>
    setWeekRef((r) => new Date(r.getFullYear(), r.getMonth(), r.getDate() + delta * 7));
  const today = new Date();
  const isThisWeek = sameWeek(weekRef, today);

  const rate = useMemo(() => weekRate(data.grid), [data.grid]);
  const overallStreak = useMemo(
    () => data.streaks.reduce((max, s) => Math.max(max, s.stats.current), 0),
    [data.streaks]
  );

  // Consistency grid: one row per goal, 7 CellState cells (Mon→Sun).
  const gridRows: GridRow[] = useMemo(
    () => data.streaks.map((s) => ({ label: s.goal.name, cells: s.cells as CellState[] })),
    [data.streaks]
  );

  return (
    <ScreenLayout>
      <AppHeader
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <BruteFlame size={14} />
            <ThemedText type="bodyStrong" color="accent1">
              {overallStreak}
            </ThemedText>
          </View>
        }
      />

      {/* Hero: this-week completion rate */}
      <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 26 }}>
        <ThemedText type="eyebrow" color="muted">
          This week
        </ThemedText>
        <ThemedText type="hero" color="accent1" style={{ marginTop: 8 }}>
          {rate === null ? '–' : `${rate}%`}
        </ThemedText>
        <ThemedText
          type="body"
          color="muted"
          style={{ marginTop: 6, textAlign: 'center', maxWidth: 280 }}
        >
          {rate === null
            ? 'Nothing due this week. Convenient.'
            : 'Better than last week. Low bar.'}
        </ThemedText>
      </View>

      {/* Week nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Pressable onPress={() => stepWeek(-1)} hitSlop={12}>
          <Icon name="chevronLeft" size={20} color={tokens.fg} strokeWidth={2.2} />
        </Pressable>
        <ThemedText type="bodyStrong">{isThisWeek ? 'This week' : weekLabel(weekRef)}</ThemedText>
        <Pressable onPress={() => stepWeek(1)} hitSlop={12} disabled={isThisWeek}>
          <Icon
            name="chevron"
            size={20}
            color={isThisWeek ? tokens.off : tokens.fg}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      {gridRows.length > 0 ? (
        <ConsistencyGrid rows={gridRows} />
      ) : (
        <Card>
          <ThemedText type="body" color="muted" style={{ textAlign: 'center' }}>
            No goals yet.
          </ThemedText>
        </Card>
      )}

      {/* Streaks */}
      <SectionHeader label="Streaks" />
      <ThemedText type="caption" color="muted" style={{ marginTop: -4, marginBottom: 12 }}>
        Days in a row you hit a goal. Flexible goals count by week.
      </ThemedText>

      {data.streaks.length === 0 ? (
        <ThemedText type="body" color="muted">
          No goals yet.
        </ThemedText>
      ) : (
        data.streaks.map(({ goal, stats, weekDone }) => {
          const unit = stats.streakUnit === 'week' ? 'week' : 'day';
          const context =
            stats.streakUnit === 'week'
              ? `${weekDone}/${goal.schedule.weeklyTarget} this week`
              : `Best: ${stats.longest} ${stats.longest === 1 ? 'day' : 'days'}`;
          return (
            <Card key={goal.id} style={styleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <ThemedText type="bodyStrong" numberOfLines={1}>
                  {goal.name}
                </ThemedText>
                <ThemedText type="caption" color="muted">
                  {context}. {stats.current === 1 ? unit : `${unit}s`} in a row.
                </ThemedText>
              </View>
              <StreakFlame count={stats.current} />
            </Card>
          );
        })
      )}

      {/* How streaks work */}
      <Pressable
        onPress={() => setShowHelp((v) => !v)}
        hitSlop={8}
        style={{ alignSelf: 'flex-start', paddingVertical: 12, marginTop: 4 }}
      >
        <ThemedText type="caption" color="accent1">
          {showHelp ? 'Hide how streaks work' : 'How streaks work'}
        </ThemedText>
      </Pressable>
      {showHelp ? (
        <View
          style={{
            backgroundColor: tokens.surface2,
            borderWidth: 1,
            borderColor: tokens.rim,
            borderRadius: 14,
            padding: 16,
            gap: 4,
          }}
        >
          <ThemedText type="bodyStrong">Day streak</ThemedText>
          <ThemedText type="caption" color="muted">
            Fixed-schedule and specific-date goals. Counts scheduled days done in a row. Days the
            goal isn&apos;t scheduled don&apos;t count against you. Miss a scheduled day, back to 0.
          </ThemedText>
          <ThemedText type="bodyStrong" style={{ marginTop: 10 }}>
            Week streak
          </ThemedText>
          <ThemedText type="caption" color="muted">
            &ldquo;X days a week&rdquo; goals. Counts weeks you hit the target in a row. This week
            counts once you reach the target. Miss a week, back to 0.
          </ThemedText>
        </View>
      ) : null}
    </ScreenLayout>
  );
}

const styleRow = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 13,
  paddingHorizontal: 16,
  marginBottom: 10,
} as const;
