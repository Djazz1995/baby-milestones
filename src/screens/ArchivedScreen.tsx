import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Card, CategoryChip, Icon } from '@/components/kit';
import { useArchivedGoals } from '@/hooks/use-archived-goals';
import { tokens } from '@/theme/tokens';

/**
 * Archived goals (§4.7). Tap one to open its detail, where Unarchive lives.
 * Reached from Settings.
 */
export function ArchivedScreen() {
  const router = useRouter();
  const { data, loading, error, refetch } = useArchivedGoals();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (loading && data.length === 0) {
    return (
      <ScreenLayout edges={['bottom']} scroll={false}>
        <ActivityIndicator style={{ marginTop: 48 }} color={tokens.muted} />
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout edges={['bottom']} scroll={false}>
        <ThemedText type="body" color="muted" style={{ textAlign: 'center', marginTop: 48 }}>
          Couldn’t load: {error.message}
        </ThemedText>
      </ScreenLayout>
    );
  }

  if (data.length === 0) {
    return (
      <ScreenLayout edges={['bottom']} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
          <ThemedText type="heading" style={{ textAlign: 'center', marginBottom: 10 }}>
            Nothing archived
          </ThemedText>
          <ThemedText
            type="body"
            color="muted"
            style={{ textAlign: 'center', maxWidth: 280, lineHeight: 22 }}
          >
            Archive a goal to keep its history without it cluttering Home.
          </ThemedText>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={['bottom']}>
      <View style={{ gap: 10, marginTop: 8 }}>
        {data.map((item) => (
          <Card
            key={item.id}
            onPress={() => router.push(`/goal/${item.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <ThemedText type="bodyStrong">{item.name}</ThemedText>
              <View style={{ flexDirection: 'row' }}>
                <CategoryChip category={item.category} />
              </View>
            </View>
            <Icon name="chevron" size={18} color={tokens.muted} />
          </Card>
        ))}
      </View>
    </ScreenLayout>
  );
}
