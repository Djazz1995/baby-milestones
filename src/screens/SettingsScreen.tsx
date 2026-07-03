import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Share, TextInput, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import {
  SegmentedControl,
  SettingsRow,
  SettingsSection,
  Sheet,
  Toggle,
} from '@/components/kit';
import { useUser } from '@/hooks/use-user';
import { ensureSession } from '@/lib/auth';
import {
  ESCALATION_LOCKED,
  LOCKED_ESCALATION,
  LOCKED_RUDENESS,
  RUDENESS_LOCKED,
} from '@/lib/config';
import type { EscalationSpeed, NotificationSound, RudenessLevel } from '@/models';
import { dataService } from '@/services/dataService';
import { tokens } from '@/theme/tokens';

// ── Display labels for the DEFAULTS values ─────────────────────────────────
const RUDENESS_LABEL: Record<RudenessLevel, string> = {
  1: 'Mild disappointment',
  2: 'Drill sergeant',
  3: 'Full roast',
  4: 'Unhinged',
};

const ESCALATION_LABEL: Record<EscalationSpeed, string> = {
  slow: 'Slow',
  normal: 'Normal',
  unhinged: 'Unhinged',
};

const SOUND_LABEL: Record<NotificationSound, string> = {
  standard: 'Standard',
  whistle: 'Drill whistle',
  foghorn: 'Foghorn',
  silent: 'Silent',
};

const SOUNDS: NotificationSound[] = ['standard', 'whistle', 'foghorn', 'silent'];
const RUDENESS_LEVELS: RudenessLevel[] = [1, 2, 3, 4];
const SPEEDS: EscalationSpeed[] = ['slow', 'normal', 'unhinged'];

/** Turn a stored "HH:mm" into a friendly "10pm" / "7am"; falls back to raw. */
function formatClock(hhmm?: string): string | null {
  if (!hhmm) return null;
  const [hRaw, mRaw] = hhmm.split(':').map((n) => Number(n));
  if (Number.isNaN(hRaw)) return hhmm;
  const period = hRaw < 12 ? 'am' : 'pm';
  const h12 = hRaw % 12 === 0 ? 12 : hRaw % 12;
  const m = mRaw && mRaw > 0 ? `:${String(mRaw).padStart(2, '0')}` : '';
  return `${h12}${m}${period}`;
}

function quietHoursValue(start?: string, end?: string): string {
  const s = formatClock(start);
  const e = formatClock(end);
  if (!s && !e) return 'Off';
  return `${s ?? '—'} to ${e ?? '—'}`;
}

type Editor = 'rudeness' | 'escalation' | 'quiet' | 'sound' | null;

export function SettingsScreen() {
  const router = useRouter();
  const { data: user, updateDefaults } = useUser();

  const [editor, setEditor] = useState<Editor>(null);
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
  const version = Constants.expoConfig?.version ?? '1.0.0';

  // Locks (§config): when locked, the value is fixed and the row is read-only.
  const rudeness = RUDENESS_LOCKED ? LOCKED_RUDENESS : d?.rudenessLevel;
  const escalation = ESCALATION_LOCKED ? LOCKED_ESCALATION : d?.escalationSpeed;

  async function saveQuietHours() {
    setEditor(null);
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
    <ScreenLayout>
      <ThemedText type="title" style={{ marginTop: 4, marginBottom: 22 }}>
        Settings
      </ThemedText>

      <SettingsSection title="DEFAULTS">
        <SettingsRow
          label="Default rudeness"
          value={rudeness ? RUDENESS_LABEL[rudeness] : undefined}
          onPress={RUDENESS_LOCKED ? undefined : () => setEditor('rudeness')}
        />
        <SettingsRow
          label="Escalation speed"
          value={escalation ? ESCALATION_LABEL[escalation] : undefined}
          onPress={ESCALATION_LOCKED ? undefined : () => setEditor('escalation')}
        />
        <SettingsRow
          label="Quiet hours"
          value={quietHoursValue(d?.quietHoursStart, d?.quietHoursEnd)}
          onPress={() => setEditor('quiet')}
        />
        <SettingsRow
          label="Notification sound"
          value={d ? SOUND_LABEL[d.sound] : undefined}
          onPress={() => setEditor('sound')}
        />
      </SettingsSection>

      <SettingsSection title="SHARING">
        <SettingsRow
          label="Always watermark shares"
          right={
            <Toggle
              value={d?.alwaysWatermark ?? true}
              onChange={(v) => updateDefaults({ alwaysWatermark: v })}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="MANAGE">
        <SettingsRow label="Accountability buddies" onPress={() => router.push('/buddy')} />
        <SettingsRow label="Collections" onPress={() => router.push('/collections')} />
        <SettingsRow label="Archived goals" onPress={() => router.push('/archived')} />
      </SettingsSection>

      <SettingsSection title="PRIVACY">
        <SettingsRow label="Export my data" onPress={busy ? undefined : onExport} />
        <SettingsRow label="Delete account" danger onPress={busy ? undefined : onDelete} />
      </SettingsSection>

      <ThemedText type="caption" color="muted" style={{ textAlign: 'center', marginTop: 4 }}>
        brute v{version}. roasts are algorithmic, not personal. mostly.
      </ThemedText>

      {/* ── Editors ──────────────────────────────────────────────────────── */}
      <Sheet visible={editor === 'rudeness'} onClose={() => setEditor(null)}>
        <ThemedText type="heading">Default rudeness</ThemedText>
        {rudeness ? (
          <SegmentedControl<RudenessLevel>
            options={RUDENESS_LEVELS.map((r) => ({ value: r, label: RUDENESS_LABEL[r] }))}
            value={rudeness}
            onChange={(v) => {
              updateDefaults({ rudenessLevel: v });
              setEditor(null);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={editor === 'escalation'} onClose={() => setEditor(null)}>
        <ThemedText type="heading">Escalation speed</ThemedText>
        {escalation ? (
          <SegmentedControl<EscalationSpeed>
            options={SPEEDS.map((s) => ({ value: s, label: ESCALATION_LABEL[s] }))}
            value={escalation}
            onChange={(v) => {
              updateDefaults({ escalationSpeed: v });
              setEditor(null);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={editor === 'sound'} onClose={() => setEditor(null)}>
        <ThemedText type="heading">Notification sound</ThemedText>
        {d ? (
          <SegmentedControl<NotificationSound>
            options={SOUNDS.map((s) => ({ value: s, label: SOUND_LABEL[s] }))}
            value={d.sound}
            onChange={(v) => {
              updateDefaults({ sound: v });
              setEditor(null);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={editor === 'quiet'} onClose={saveQuietHours}>
        <ThemedText type="heading">Quiet hours</ThemedText>
        <ThemedText type="caption" color="muted" style={{ textAlign: 'center' }}>
          No notifications fire in this window. Use 24-hour HH:mm.
        </ThemedText>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <QuietInput value={quietStart} onChangeText={setQuietStart} placeholder="22:00" />
          <QuietInput value={quietEnd} onChangeText={setQuietEnd} placeholder="07:00" />
        </View>
      </Sheet>
    </ScreenLayout>
  );
}

/** Small themed HH:mm field for the quiet-hours editor. */
function QuietInput({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={tokens.muted}
      keyboardType="numbers-and-punctuation"
      style={{
        flex: 1,
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: tokens.surface,
        borderWidth: 1,
        borderColor: tokens.rim,
        color: tokens.fg,
        fontSize: 16,
        textAlign: 'center',
      }}
    />
  );
}
