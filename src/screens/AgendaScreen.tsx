import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGoals } from '@/hooks/use-goals';
import { useTodayStatuses } from '@/hooks/use-today-status';
import type { Goal, TodayStatus } from '@/models';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

/** Mon→Sun dates of the week containing `d`. */
function weekDates(d: Date): Date[] {
  const offset = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DayEntry = { goal: Goal; times: string[]; flexible: boolean };

/** Goals due on a given weekday: fixed slots on that day, weekly goals any day. */
function goalsForDay(goals: Goal[], day: number): DayEntry[] {
  const out: DayEntry[] = [];
  for (const g of goals) {
    if (g.paused || g.archived) continue;
    const times = g.schedule.slots.filter((s) => s.day === day).map((s) => s.time);
    if (g.schedule.weeklyTarget) out.push({ goal: g, times, flexible: true });
    else if (times.length > 0) out.push({ goal: g, times, flexible: false });
  }
  return out;
}

const STATUS_COLOR: Record<TodayStatus, string | null> = {
  done: '#30A46C',
  skipped: '#E5484D',
  pending: '#3c87f7',
  off: null,
};

export function AgendaScreen() {
  const { data: goals, refetch } = useGoals();
  const { data: statuses, refetch: refetchStatuses } = useTodayStatuses(goals);
  const [selected, setSelected] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStatuses();
    }, [refetch, refetchStatuses])
  );

  const today = new Date();
  const days = useMemo(() => weekDates(selected), [selected]);
  const entries = useMemo(() => goalsForDay(goals, isoDay(selected)), [goals, selected]);
  const isToday = sameDay(selected, today);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          Agenda for this week
        </ThemedText>

        <View style={styles.strip}>
          {days.map((d) => {
            const active = sameDay(d, selected);
            return (
              <Pressable key={d.toISOString()} onPress={() => setSelected(d)} style={{ flex: 1 }}>
                <ThemedView
                  type={active ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.day, active && styles.dayActive]}
                >
                  <ThemedText type="small" themeColor="textSecondary">
                    {WEEKDAYS[isoDay(d) - 1]}
                  </ThemedText>
                  <ThemedText type="smallBold">{d.getDate()}</ThemedText>
                  {sameDay(d, today) ? <View style={styles.todayDot} /> : null}
                </ThemedView>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {entries.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Nothing due this day.
            </ThemedText>
          ) : (
            entries.map(({ goal, times, flexible }) => {
              const status = isToday ? statuses[goal.id]?.status : undefined;
              const color = status ? STATUS_COLOR[status] : null;
              return (
                <Link key={goal.id} href={`/goal/${goal.id}`} asChild>
                  <Pressable>
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">{goal.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {flexible
                            ? `${goal.schedule.weeklyTarget} ${goal.schedule.weeklyTarget === 1 ? 'day' : 'days'} a week`
                            : times.join(', ')}
                        </ThemedText>
                      </View>
                      {color ? (
                        <View style={[styles.badge, { backgroundColor: color }]}>
                          <ThemedText type="small" style={styles.badgeText}>
                            {status === 'done' ? 'Done' : status === 'skipped' ? 'Skipped' : 'Today'}
                          </ThemedText>
                        </View>
                      ) : null}
                    </ThemedView>
                  </Pressable>
                </Link>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  title: { paddingVertical: Spacing.three },
  strip: { flexDirection: 'row', gap: Spacing.one, marginBottom: Spacing.three },
  day: { alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Spacing.two, gap: Spacing.half },
  dayActive: { borderColor: '#3c87f7', borderWidth: 1 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3c87f7' },
  list: { gap: Spacing.two, paddingBottom: Spacing.six },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Spacing.five },
  badgeText: { color: '#fff', fontWeight: '600' },
});
