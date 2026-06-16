import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function SettingsScreen() {
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="subtitle">Settings</ThemedText>

        <Pressable onPress={() => router.push('/buddy')}>
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">Accountability buddies</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Manage who sees your wins and bails
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </ThemedView>
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary">
          Global defaults (rudeness, quiet hours, sound) land in Phase 8.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
