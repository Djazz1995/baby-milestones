import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useCollections } from '@/hooks/use-collections';
import { useGoals } from '@/hooks/use-goals';
import { useTodayStatuses } from '@/hooks/use-today-status';
import type { Collection, Goal, GoalToday, TodayStatus } from '@/models';

const UNGROUPED = 'Ungrouped';

/** Groups goals by collection name; only adds headers when collections exist. */
function buildSections(goals: Goal[], collections: Collection[]) {
  const nameById = new Map(collections.map((c) => [c.id, c.name]));
  // Section order: each collection (creation order), then Ungrouped last.
  const order = [...collections.map((c) => c.name), UNGROUPED];
  const byTitle = new Map<string, Goal[]>();
  for (const g of goals) {
    const title = (g.collectionId && nameById.get(g.collectionId)) || UNGROUPED;
    const list = byTitle.get(title) ?? [];
    list.push(g);
    byTitle.set(title, list);
  }
  return order
    .filter((title) => byTitle.has(title))
    .map((title) => ({ title, data: byTitle.get(title)! }));
}

export function HomeScreen() {
  const router = useRouter();
  const { data: goals, loading, error, refetch } = useGoals();
  const { data: collections, refetch: refetchCollections } = useCollections();
  const { data: statuses, refetch: refetchStatuses } = useTodayStatuses(goals);

  // Refresh when returning from create/edit/detail.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchCollections();
      refetchStatuses();
    }, [refetch, refetchCollections, refetchStatuses])
  );

  const sections = useMemo(() => buildSections(goals, collections), [goals, collections]);
  const showHeaders = collections.length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Your Goals</ThemedText>
        </View>

        {loading && goals.length === 0 ? (
          <ActivityIndicator style={styles.center} />
        ) : error ? (
          <ThemedText type="small" style={styles.center}>
            Couldn’t load goals: {error.message}
          </ThemedText>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={
              showHeaders
                ? ({ section }) => (
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.section}>
                      {section.title}
                    </ThemedText>
                  )
                : undefined
            }
            renderItem={({ item }) => <GoalRow goal={item} today={statuses[item.id]} />}
            ListEmptyComponent={
              <ThemedText type="small" style={styles.center}>
                No goals yet. Add one to get roasted.
              </ThemedText>
            }
          />
        )}

        <View style={styles.footer}>
          <Button title="+ New Goal" onPress={() => router.push('/goal/new')} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const STATUS_META: Record<TodayStatus, { label: string; color: string } | null> = {
  done: { label: 'Done', color: '#30A46C' },
  skipped: { label: 'Skipped', color: '#E5484D' },
  pending: { label: 'Today', color: '#3c87f7' },
  off: null,
};

/** Weekly goals show N/target progress; fixed goals show today's status. */
function TodayBadge({ today }: { today?: GoalToday }) {
  if (!today) return null;
  if (today.weekTarget != null) {
    const met = today.weekDone >= today.weekTarget;
    return (
      <View style={[styles.badge, { backgroundColor: met ? '#30A46C' : '#3c87f7' }]}>
        <ThemedText type="small" style={styles.badgeText}>
          {today.weekDone}/{today.weekTarget}
        </ThemedText>
      </View>
    );
  }
  const meta = STATUS_META[today.status];
  if (!meta) return null;
  return (
    <View style={[styles.badge, { backgroundColor: meta.color }]}>
      <ThemedText type="small" style={styles.badgeText}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

function cadenceText(goal: Goal): string {
  if (goal.schedule.weeklyTarget) {
    return `${goal.schedule.weeklyTarget} ${goal.schedule.weeklyTarget === 1 ? 'day' : 'days'} a week`;
  }
  const n = goal.schedule.slots.length;
  return `${n} ${n === 1 ? 'reminder' : 'reminders'}`;
}

function GoalRow({ goal, today }: { goal: Goal; today?: GoalToday }) {
  return (
    <Link href={`/goal/${goal.id}`} asChild>
      <Pressable>
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">{goal.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {goal.category}
              {goal.paused ? ' · paused' : ''} · {cadenceText(goal)}
            </ThemedText>
          </View>
          <TodayBadge today={today} />
          <ThemedText type="small" themeColor="textSecondary">
            ›
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: {
    paddingVertical: Spacing.three,
  },
  center: { textAlign: 'center', marginTop: Spacing.five },
  list: { gap: Spacing.two, paddingBottom: Spacing.three },
  section: { marginTop: Spacing.three, marginBottom: Spacing.one, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  footer: { paddingTop: Spacing.three, paddingBottom: BottomTabInset + Spacing.three },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  badgeText: { color: '#ffffff', fontWeight: '600' },
});
