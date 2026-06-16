import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGoal } from '@/hooks/use-goal';
import { useSkip } from '@/hooks/use-skip';
import type { RudenessLevel } from '@/models';

const REASONS = ['No time', 'Too tired', 'Not feeling it', 'Sick', 'Other'];

/**
 * Placeholder skip roasts (§4.5), tiered by rudeness level (§6). Phase 6
 * replaces these with the cached, model-generated pool. Golden rule (§3.1):
 * roast the excuse and the behavior, never the person.
 */
const SKIP_ROASTS: Record<RudenessLevel, ((reason: string) => string)[]> = {
  1: [
    (r) => `Skipping for “${r}”. That’s a little disappointing, but okay.`,
    () => `Logged. We’ll pretend this didn’t happen. Try tomorrow?`,
  ],
  2: [
    (r) => `“${r}.” Excuse received and filed. Streak’s bleeding. Fix it tomorrow.`,
    () => `Skip logged. No medals for showing up to bail. Move.`,
  ],
  3: [
    (r) => `“${r}” — the hit single that never stops playing. Streak’s dead, and you killed it.`,
    () => `Skipped again. At this point the gym is just a building you’ve heard rumors about.`,
    (r) => `Bold of you to type “${r}” and hit confirm. The couch is proud. Nobody else is.`,
  ],
  4: [
    (r) =>
      `The Council of Goals has reviewed “${r}.” Verdict: denied, embarrassing, and weirdly on-brand. Streak revoked.`,
    () =>
      `BREAKING: local legend folds to the couch for the umpteenth time. Couch declares a dynasty. Crowd goes mild.`,
    (r) => `“${r}.” Magnificent work of fiction. The streak wept, then perished. Curtains.`,
  ],
};

function pickRoast(level: RudenessLevel, reason: string): string {
  const bank = SKIP_ROASTS[level];
  return bank[Math.floor(Math.random() * bank.length)](reason);
}

const COUNTDOWN_SECONDS = 5;

type Props = { goalId: string };

export function SkipScreen({ goalId }: Props) {
  const router = useRouter();
  const { data: goal } = useGoal(goalId);
  const { skip, skipping } = useSkip();
  const [step, setStep] = useState<'reason' | 'confirm' | 'done'>('reason');
  const [reason, setReason] = useState<string>();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [roast, setRoast] = useState('');
  const [error, setError] = useState<string>();

  // Friction: count down before the skip button unlocks.
  useEffect(() => {
    if (step !== 'confirm') return;
    setCountdown(COUNTDOWN_SECONDS);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  function pickReason(r: string) {
    setReason(r);
    setStep('confirm');
  }

  async function confirmSkip() {
    if (!reason) return;
    try {
      await skip(goalId, reason);
      setRoast(pickRoast(goal?.rudenessLevel ?? 3, reason));
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {step === 'reason' ? (
          <>
            <ThemedText type="subtitle">Why are you bailing?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Pick a reason. It gets logged and counts against your streak.
            </ThemedText>
            <View style={styles.reasons}>
              {REASONS.map((r) => (
                <Pressable key={r} onPress={() => pickReason(r)}>
                  <ThemedView type="backgroundElement" style={styles.reasonRow}>
                    <ThemedText type="default">{r}</ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
            <Button title="Never mind, I’ll do it" onPress={() => router.back()} />
          </>
        ) : step === 'confirm' ? (
          <>
            <ThemedText type="subtitle">You sure?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Skipping “{reason}”. This breaks your streak.
            </ThemedText>
            {error ? (
              <ThemedText type="small" style={{ color: '#E5484D' }}>
                {error}
              </ThemedText>
            ) : null}
            <Button
              title={countdown > 0 ? `Skip in ${countdown}…` : 'Skip anyway'}
              variant="danger"
              disabled={countdown > 0}
              loading={skipping}
              onPress={confirmSkip}
            />
            <Button title="Actually, no — I’ll do it" onPress={() => router.back()} />
          </>
        ) : (
          <>
            <ThemedText type="subtitle">Skipped.</ThemedText>
            <ThemedText type="default">{roast}</ThemedText>
            <Button title="Close" onPress={() => router.back()} />
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.three, gap: Spacing.three, justifyContent: 'center' },
  reasons: { gap: Spacing.two },
  reasonRow: { padding: Spacing.three, borderRadius: Spacing.three },
});
