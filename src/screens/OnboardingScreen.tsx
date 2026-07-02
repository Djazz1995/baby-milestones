import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import {
  ESCALATION_LOCKED,
  LOCKED_ESCALATION,
  LOCKED_RUDENESS,
  RUDENESS_LOCKED,
} from '@/lib/config';
import type { EscalationSpeed, GoalCategory, RudenessLevel, Schedule } from '@/models';
import { goalService } from '@/services/goalService';
import { notificationService } from '@/services/notificationService';
import { userService } from '@/services/userService';

import { EscalationBlock, RudenessBlock } from './goal-form/blocks';
import { GOAL_TYPES } from './goal-form/config';

type Step = 'welcome' | 'consent' | 'defaults' | 'push' | 'goal';
// The "defaults" step only has the rudeness/escalation pickers — drop it when
// both are locked (nothing to configure).
const SHOW_DEFAULTS = !(RUDENESS_LOCKED && ESCALATION_LOCKED);
const ORDER: Step[] = [
  'welcome',
  'consent',
  ...(SHOW_DEFAULTS ? (['defaults'] as Step[]) : []),
  'push',
  'goal',
];

/** First-goal habit templates (§14.1 / Phase 8) — one tap to a real goal. */
const TEMPLATES: { key: string; category: GoalCategory; name: string }[] = [
  { key: 'gym', category: 'gym', name: 'Gym' },
  { key: 'water', category: 'water', name: 'Drink water' },
  { key: 'read', category: 'study', name: 'Read' },
  { key: 'chores', category: 'chores', name: 'Tidy up' },
];

/** Concrete Schedule from a category's prefill defaults (fixed gets real slots). */
function templateSchedule(category: GoalCategory): Schedule {
  const cfg = GOAL_TYPES[category].defaults;
  if (cfg.scheduleMode === 'weekly') return { slots: [], weeklyTarget: cfg.weeklyTarget ?? 3 };
  const days = cfg.defaultDays ?? [1, 3, 5];
  const time = cfg.defaultTime ?? '09:00';
  return { slots: days.map((day) => ({ day, time })) };
}

/**
 * Cold-start onboarding (§14.1): welcome → harsh-humor consent (§9.1) → default
 * tone → push permission → first goal (habit templates). Finishing flips the
 * `onboarded` flag and drops the user on Home.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [rudeness, setRudeness] = useState<RudenessLevel>(RUDENESS_LOCKED ? LOCKED_RUDENESS : 3);
  const [speed, setSpeed] = useState<EscalationSpeed>(
    ESCALATION_LOCKED ? LOCKED_ESCALATION : 'normal'
  );
  const [busy, setBusy] = useState(false);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);

  async function saveDefaults() {
    setBusy(true);
    try {
      await userService.updateDefaults({ rudenessLevel: rudeness, escalationSpeed: speed });
      next();
    } catch (e) {
      Alert.alert('Could not save', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestPush() {
    setBusy(true);
    try {
      await notificationService.init(); // no-op on web; granted/denied both proceed
    } finally {
      setBusy(false);
      next();
    }
  }

  /** Finish onboarding and land on Home. */
  async function finish() {
    setBusy(true);
    try {
      await userService.completeOnboarding();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Could not finish', (e as Error).message);
      setBusy(false);
    }
  }

  async function pickTemplate(category: GoalCategory, name: string) {
    setBusy(true);
    try {
      const cfg = GOAL_TYPES[category].defaults;
      const saved = await goalService.create({
        name,
        category,
        schedule: templateSchedule(category),
        rudenessLevel: rudeness,
        escalationSpeed: speed,
        blockers: [],
        targetValue: cfg.trackAmount ? cfg.defaultTarget : undefined,
        unit: cfg.trackAmount ? cfg.defaultUnit : undefined,
      });
      await notificationService.scheduleForGoal(saved);
      await finish();
    } catch (e) {
      Alert.alert('Could not create goal', (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'welcome' ? (
            <>
              <ThemedText type="title">brute</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                A habit tracker with a mouth. Set a goal, get pushed, get roasted
                if you bail.
              </ThemedText>
              <View style={styles.sampleCard}>
                <ThemedText style={styles.sampleText}>
                  “Your gym shoes are by the door. They’re just sitting there.
                  Staring at you.”
                </ThemedText>
              </View>
              <Button title="Let’s go" onPress={next} />
            </>
          ) : step === 'consent' ? (
            <>
              <ThemedText type="title">Read this first</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                brute will roast you — personally, bluntly, and on purpose. It’ll call out
                your excuses, your flaking, and your “I’ll start Monday” energy. It’s mean because
                that’s the point.
              </ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                You might get offended. That’s the deal you’re opting into. You can mute any goal
                or turn notifications off anytime.
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Hard lines we never cross: nothing about your body, weight, looks, identity, or
                mental health. The roast is about your habits, not who you are.
              </ThemedText>
              <Button title="I can take it" onPress={next} />
            </>
          ) : step === 'defaults' ? (
            <>
              <ThemedText type="title">Set the pace</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                How fast should the roasts escalate when you ignore a goal?
              </ThemedText>
              {!RUDENESS_LOCKED ? <RudenessBlock value={rudeness} onChange={setRudeness} /> : null}
              {!ESCALATION_LOCKED ? <EscalationBlock value={speed} onChange={setSpeed} /> : null}
              <Button title="Next" onPress={saveDefaults} loading={busy} />
            </>
          ) : step === 'push' ? (
            <>
              <ThemedText type="title">Turn on the heat</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                brute works through notifications. Allow them so it can
                actually nudge you.
              </ThemedText>
              <Button title="Allow notifications" onPress={requestPush} loading={busy} />
              <Pressable onPress={next} hitSlop={8} style={styles.skip}>
                <ThemedText type="small" themeColor="textSecondary">
                  Not now
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="title">Your first goal</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Pick a starter — it’s set up for you. Tweak it anytime.
              </ThemedText>
              <View style={styles.templates}>
                {TEMPLATES.map((t) => (
                  <Pressable
                    key={t.key}
                    disabled={busy}
                    onPress={() => pickTemplate(t.category, t.name)}
                  >
                    <ThemedView type="backgroundElement" style={styles.templateRow}>
                      <ThemedText type="default">{t.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t.category}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
              <Button
                title="I’ll set one up later"
                variant="secondary"
                onPress={finish}
                loading={busy}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, flexGrow: 1, justifyContent: 'center' },
  sampleCard: { backgroundColor: '#15131f', borderRadius: Spacing.four, padding: Spacing.four },
  sampleText: { color: '#ffffff', fontSize: 18, fontWeight: '600', lineHeight: 26 },
  skip: { alignSelf: 'center', paddingVertical: Spacing.two },
  templates: { gap: Spacing.two },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
