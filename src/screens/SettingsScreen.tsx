import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUser } from '@/hooks/use-user';
import { ensureSession } from '@/lib/auth';
import { ESCALATION_LOCKED, RUDENESS_LOCKED } from '@/lib/config';
import type { NotificationSound } from '@/models';
import { dataService } from '@/services/dataService';

import { EscalationBlock, RudenessBlock } from './goal-form/blocks';
import { ChipRow, Field, useInputStyle } from './goal-form/fields';

const SOUNDS: NotificationSound[] = ['standard', 'whistle', 'foghorn', 'silent'];

export function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const { data: user, updateDefaults } = useUser();

  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [busy, setBusy] = useState(false);

  // Sync quiet-hours inputs once the profile loads.
  useEffect(() => {
    if (!user) return;
    setQuietStart(user.defaults.quietHoursStart ?? '');
    setQuietEnd(user.defaults.quietHoursEnd ?? '');
  }, [user]);

  const d = user?.defaults;

  async function saveQuietHours() {
    await updateDefaults({
      quietHoursStart: quietStart.trim() || undefined,
      quietHoursEnd: quietEnd.trim() || undefined,
    }).catch((e) => Alert.alert('Could not save', (e as Error).message));
  }

  async function onExport() {
    setBusy(true);
    try {
      const bundle = await dataService.exportData();
      await Share.share({ message: JSON.stringify(bundle, null, 2) });
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onDelete() {
    Alert.alert(
      'Delete all your data?',
      'This permanently erases your goals, history, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await dataService.deleteAccount();
              await ensureSession(); // fresh anonymous user
              router.replace('/onboarding');
            } catch (e) {
              Alert.alert('Delete failed', (e as Error).message);
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Settings</ThemedText>

          {d ? (
            <>
              <ThemedText type="smallBold">Defaults for new goals</ThemedText>
              {!RUDENESS_LOCKED ? (
                <RudenessBlock
                  value={d.rudenessLevel}
                  onChange={(v) => updateDefaults({ rudenessLevel: v })}
                />
              ) : null}
              {!ESCALATION_LOCKED ? (
                <EscalationBlock
                  value={d.escalationSpeed}
                  onChange={(v) => updateDefaults({ escalationSpeed: v })}
                />
              ) : null}
              <Field label="Notification sound">
                <ChipRow
                  options={SOUNDS}
                  selected={d.sound}
                  onSelect={(v) => updateDefaults({ sound: v })}
                  label={(s) => s}
                />
              </Field>
              <Field label="Quiet hours (HH:mm)">
                <View style={styles.quietRow}>
                  <TextInput
                    value={quietStart}
                    onChangeText={setQuietStart}
                    onBlur={saveQuietHours}
                    placeholder="22:00"
                    placeholderTextColor={theme.textSecondary}
                    style={[inputStyle, styles.quietInput]}
                  />
                  <TextInput
                    value={quietEnd}
                    onChangeText={setQuietEnd}
                    onBlur={saveQuietHours}
                    placeholder="07:00"
                    placeholderTextColor={theme.textSecondary}
                    style={[inputStyle, styles.quietInput]}
                  />
                </View>
              </Field>
            </>
          ) : null}

          <ThemedText type="smallBold">Manage</ThemedText>
          <NavRow
            title="Accountability buddies"
            sub="Manage who sees your wins and bails"
            onPress={() => router.push('/buddy')}
          />
          <NavRow
            title="Collections"
            sub="Group goals under a bigger ambition"
            onPress={() => router.push('/collections')}
          />
          <NavRow
            title="Archived goals"
            sub="View or restore goals you’ve archived"
            onPress={() => router.push('/archived')}
          />

          <ThemedText type="smallBold">Privacy</ThemedText>
          <Button title="Export my data" variant="secondary" onPress={onExport} loading={busy} />
          <Button title="Delete my data" variant="danger" onPress={onDelete} disabled={busy} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function NavRow({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {sub}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          ›
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  quietRow: { flexDirection: 'row', gap: Spacing.two },
  quietInput: { flex: 1 },
});
