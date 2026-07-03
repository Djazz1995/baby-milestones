import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { BruteFlame } from '@/components/brute-logo';
import { GoalCard } from '@/components/goal-card';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { AppHeader, Card, CategoryChip, StreakFlame } from '@/components/kit';
import { ymd } from '@/components/month-calendar';
import { useGoalStreaks } from '@/hooks/use-goal-streaks';
import { useGoals } from '@/hooks/use-goals';
import { useTodayStatuses } from '@/hooks/use-today-status';
import type { Goal } from '@/models';
import { tokens } from '@/theme/tokens';
import { formatTime } from '@/utils/goal-format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** How many days forward the agenda spans. */
const HORIZON = 14;

const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

type DayEntry = { goal: Goal; times: string[] };

/**
 * Goals due on a given date: fixed slots on that weekday, weekly-target goals
 * any day, specific-dates goals on their picked dates. Excludes goals on dates
 * before they were created (no time travel).
 */
function goalsForDay(goals: Goal[], date: Date): DayEntry[] {
  const day = isoDay(date);
  const dateYmd = ymd(date);
  const dayFloor = startOfDay(date).getTime();
  const out: DayEntry[] = [];
  for (const g of goals) {
    if (g.paused || g.archived) continue;
    if (dayFloor < startOfDay(new Date(g.createdAt)).getTime()) continue;
    if (g.schedule.dates?.length) {
      if (g.schedule.dates.includes(dateYmd)) {
        out.push({ goal: g, times: g.schedule.time ? [g.schedule.time] : [] });
      }
    } else if (g.schedule.weeklyTarget) {
      out.push({ goal: g, times: [] });
    } else {
      const times = g.schedule.slots.filter((s) => s.day === day).map((s) => s.time);
      if (times.length > 0) out.push({ goal: g, times });
    }
  }
  // Earliest time first; untimed (weekly) goals sink to the bottom.
  return out.sort((a, b) => (a.times[0] ?? '99:99').localeCompare(b.times[0] ?? '99:99'));
}

function dayHeading(d: Date, today: Date): string {
  const label = `${WEEKDAYS[isoDay(d) - 1]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (sameDay(d, today)) return `Today · ${label}`;
  if (sameDay(d, addDays(today, 1))) return `Tomorrow · ${label}`;
  return label;
}

export function AgendaScreen() {
  const router = useRouter();
  const { data: goals, refetch } = useGoals();
  const { data: statuses, refetch: refetchStatuses } = useTodayStatuses(goals);
  const { data: streaks, refetch: refetchStreaks } = useGoalStreaks(goals);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStatuses();
      refetchStreaks();
    }, [refetch, refetchStatuses, refetchStreaks]),
  );

  const today = useMemo(() => startOfDay(new Date()), []);

  // The complete agenda: every day from today forward (within the horizon)
  // that has at least one scheduled goal, each with its goals.
  const sections = useMemo(() => {
    const out: { date: Date; entries: DayEntry[] }[] = [];
    for (let i = 0; i < HORIZON; i++) {
      const d = addDays(today, i);
      const entries = goalsForDay(goals, d);
      if (entries.length > 0) out.push({ date: d, entries });
    }
    return out;
  }, [goals, today]);

  const bestStreak = useMemo(() => {
    const values = Object.values(streaks);
    return values.length ? Math.max(...values) : 0;
  }, [streaks]);

  return (
    <ScreenLayout>
      <AppHeader
        right={
          bestStreak > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: tokens.surface2,
                borderWidth: 1,
                borderColor: tokens.rim,
                borderRadius: 999,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 8,
                paddingRight: 12,
              }}
            >
              <BruteFlame size={14} />
              <ThemedText type="bodyStrong" color="accent1">
                {bestStreak}
              </ThemedText>
            </View>
          ) : undefined
        }
      />

      <ThemedText type="title" style={{ fontSize: 28, marginBottom: 4 }}>
        Agenda
      </ThemedText>
      <ThemedText type="caption" color="muted" style={{ fontSize: 13, marginBottom: 18 }}>
        The next two weeks. No hiding.
      </ThemedText>

      {sections.length === 0 ? (
        <ThemedText type="body" color="muted" style={{ textAlign: 'center', marginTop: 40 }}>
          Nothing on the books. Suspicious.
        </ThemedText>
      ) : (
        sections.map(({ date, entries }) => {
          const isToday = sameDay(date, today);
          return (
            <View key={ymd(date)} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 12 }}>
                <ThemedText type="subheading" color={isToday ? 'accent1' : 'fg'}>
                  {dayHeading(date, today)}
                </ThemedText>
                <View style={{ flex: 1, height: 1, backgroundColor: tokens.rim }} />
              </View>

              {entries.map(({ goal, times }) =>
                isToday ? (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    today={statuses[goal.id]}
                    streak={streaks[goal.id]}
                    onPress={() => router.push(`/goal/${goal.id}`)}
                  />
                ) : (
                  <UpcomingRow
                    key={goal.id}
                    goal={goal}
                    times={times}
                    streak={streaks[goal.id]}
                    onPress={() => router.push(`/goal/${goal.id}`)}
                  />
                ),
              )}
            </View>
          );
        })
      )}
    </ScreenLayout>
  );
}

/** A preview row for an upcoming (non-today) day: name, category, and time(s). */
function UpcomingRow({
  goal,
  times,
  streak,
  onPress,
}: {
  goal: Goal;
  times: string[];
  streak?: number;
  onPress: () => void;
}) {
  const timeLabel =
    times.length > 0 ? times.map(formatTime).join(' · ') : goal.schedule.weeklyTarget ? 'Any time' : '';
  return (
    <Card onPress={onPress} style={{ marginBottom: 10, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subheading" style={{ fontSize: 15, marginBottom: 7 }}>
            {goal.name}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CategoryChip category={goal.category} />
            {timeLabel ? (
              <ThemedText type="caption" color="muted" style={{ fontSize: 12 }}>
                {timeLabel}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {streak != null ? <StreakFlame count={streak} size={14} textSize={15} /> : null}
      </View>
    </Card>
  );
}
