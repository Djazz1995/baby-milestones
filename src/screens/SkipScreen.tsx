import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGoal } from '@/hooks/use-goal';
import { useRoast } from '@/hooks/use-roast';
import { useSkip } from '@/hooks/use-skip';

const REASONS = ['No time', 'Too tired', 'Not feeling it', 'Sick', 'Other'];

const COUNTDOWN_SECONDS = 5;

type Props = { goalId: string };

export function SkipScreen({ goalId }: Props) {
  const router = useRouter();
  const { data: goal } = useGoal(goalId);
  const { skip, skipping } = useSkip();
  const { getSkip } = useRoast();
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
      const line = await getSkip(goal?.rudenessLevel ?? 3, reason).catch(
        () => 'Skip logged. Counts against your streak.'
      );
      setRoast(line);
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
