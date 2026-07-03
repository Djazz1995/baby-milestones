import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { BruteLogo } from '@/components/brute-logo';
import { GoalCard } from '@/components/goal-card';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { AppHeader, Card, Icon, PrimaryButton, SectionHeader } from '@/components/kit';
import { useCollections } from '@/hooks/use-collections';
import { useGoalStreaks } from '@/hooks/use-goal-streaks';
import { useGoals } from '@/hooks/use-goals';
import { useTodayStatuses } from '@/hooks/use-today-status';
import type { Collection, Goal } from '@/models';
import { tokens } from '@/theme/tokens';

const UNGROUPED = 'Ungrouped';

/** Groups goals by collection name; Ungrouped ("Your Goals") sorts last. */
function buildSections(goals: Goal[], collections: Collection[]) {
  const nameById = new Map(collections.map((c) => [c.id, c.name]));
  const order = [...collections.map((c) => c.name), UNGROUPED];
  const byTitle = new Map<string, Goal[]>();
  for (const g of goals) {
    const title = (g.collectionId && nameById.get(g.collectionId)) || UNGROUPED;
    (byTitle.get(title) ?? byTitle.set(title, []).get(title)!).push(g);
  }
  return order.filter((t) => byTitle.has(t)).map((title) => ({ title, data: byTitle.get(title)! }));
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function HomeScreen() {
  const router = useRouter();
  const { data: goals, loading, error, refetch } = useGoals();
  const { data: collections, refetch: refetchCollections } = useCollections();
  const { data: statuses, refetch: refetchStatuses } = useTodayStatuses(goals);
  const { data: streaks, refetch: refetchStreaks } = useGoalStreaks(goals);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchCollections();
      refetchStatuses();
      refetchStreaks();
    }, [refetch, refetchCollections, refetchStatuses, refetchStreaks]),
  );

  const sections = useMemo(() => buildSections(goals, collections), [goals, collections]);
  const isEmpty = !loading && goals.length === 0 && !error;

  if (isEmpty) {
    return (
      <ScreenLayout scroll={false}>
        <AppHeader />
        <EmptyState onCreate={() => router.push('/goal/new')} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader />

      <ThemedText type="greeting" style={{ marginTop: 2, marginBottom: 4 }}>
        {goals.length} {goals.length === 1 ? 'goal' : 'goals'} today.{'\n'}Let&apos;s see if you actually
        show up.
      </ThemedText>
      <ThemedText type="caption" color="muted" style={{ fontSize: 14, marginBottom: 18 }}>
        {todayLabel()}
      </ThemedText>

      <PrimaryButton
        title="New goal"
        icon={<Icon name="plus" size={18} color={tokens.accentText} strokeWidth={2.3} />}
        onPress={() => router.push('/goal/new')}
      />

      {loading && goals.length === 0 ? (
        <LoadingCards />
      ) : error ? (
        <ThemedText type="body" color="muted" style={{ textAlign: 'center', marginTop: 40 }}>
          Couldn’t load goals. {error.message}
        </ThemedText>
      ) : (
        sections.map((section) => (
          <View key={section.title}>
            <SectionHeader
              label={section.title === UNGROUPED ? 'Your Goals' : section.title}
              collection={section.title !== UNGROUPED}
            />
            {section.data.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                today={statuses[goal.id]}
                streak={streaks[goal.id]}
                onPress={() => router.push(`/goal/${goal.id}`)}
              />
            ))}
          </View>
        ))
      )}
    </ScreenLayout>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingBottom: 60 }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 24,
          backgroundColor: tokens.surface,
          borderWidth: 1,
          borderColor: tokens.rim,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <BruteLogo size={40} outline />
      </View>
      <ThemedText type="title" style={{ fontSize: 26, textAlign: 'center', marginBottom: 10 }}>
        Zero goals.{'\n'}
        <ThemedText type="title" style={{ fontSize: 26 }} color="accent1">
          Zero effort.
        </ThemedText>
      </ThemedText>
      <ThemedText
        type="body"
        color="muted"
        style={{ fontSize: 14.5, lineHeight: 22, textAlign: 'center', maxWidth: 270, marginBottom: 30 }}
      >
        Bold strategy, showing up to an app with nothing to show up for. Give me something to hold you to.
      </ThemedText>
      <View style={{ width: '100%', maxWidth: 300 }}>
        <PrimaryButton
          title="Create your first goal"
          icon={<Icon name="plus" size={18} color={tokens.accentText} strokeWidth={2.3} />}
          onPress={onCreate}
        />
      </View>
    </View>
  );
}

/** Lightweight skeleton while the first load resolves. */
function LoadingCards() {
  return (
    <View style={{ marginTop: 22 }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          <View style={{ height: 14, width: '55%', borderRadius: 6, backgroundColor: tokens.surface2, marginBottom: 12 }} />
          <View style={{ height: 11, width: '35%', borderRadius: 6, backgroundColor: tokens.surface2 }} />
          <View style={{ height: 20, width: 70, borderRadius: 999, backgroundColor: tokens.surface2, marginTop: 16 }} />
        </Card>
      ))}
    </View>
  );
}
