import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { CATEGORY_LABEL, DangerButton, GhostButton } from '@/components/kit';
import { useGoal } from '@/hooks/use-goal';
import { useRoast } from '@/hooks/use-roast';
import { useSkip } from '@/hooks/use-skip';
import { tokens, tint } from '@/theme/tokens';

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
    // Last-chance roast shown BEFORE committing. a motivator to back out (§4.5).
    getSkip(goal?.rudenessLevel ?? 3, r)
      .then(setRoast)
      .catch(() => setRoast('Sure this is the move? The streak won’t hold itself.'));
  }

  async function confirmSkip() {
    if (!reason) return;
    try {
      await skip(goalId, reason);
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const subtitle = goal
    ? `${goal.name} · ${CATEGORY_LABEL[goal.category]}`
    : undefined;

  // Footer swaps per step; friction (countdown-locked skip) preserved.
  const footer =
    step === 'reason' ? (
      <GhostButton title="Never mind" onPress={() => router.back()} />
    ) : step === 'confirm' ? (
      <View style={{ gap: 12 }}>
        <GhostButton title="Never mind" onPress={() => router.back()} />
        <DangerButton
          title={countdown > 0 ? `Skip in ${countdown}…` : 'Skip anyway'}
          disabled={countdown > 0 || skipping}
          onPress={confirmSkip}
        />
      </View>
    ) : (
      <View style={{ gap: 12 }}>
        <GhostButton
          title="Share this"
          onPress={() =>
            router.push({
              pathname: '/share/[cardId]',
              params: { cardId: 'skip', text: roast, goalName: goal?.name ?? '' },
            })
          }
        />
        <DangerButton title="Close" onPress={() => router.back()} />
      </View>
    );

  return (
    <ScreenLayout edges={['bottom']} footer={footer}>
      <ThemedText type="heading" style={{ marginTop: 8 }}>
        {step === 'done' ? 'Skipped.' : 'Bailing already?'}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="caption" color="muted" style={{ marginTop: 4 }}>
          {subtitle}
        </ThemedText>
      ) : null}

      {step === 'reason' ? (
        <>
          <ThemedText type="body" color="muted" style={{ marginTop: 16 }}>
            Pick a reason. It gets logged and counts against your streak.
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            {REASONS.map((r) => (
              <ReasonChip key={r} label={r} selected={reason === r} onPress={() => pickReason(r)} />
            ))}
          </View>
        </>
      ) : step === 'confirm' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            {REASONS.map((r) => (
              <ReasonChip key={r} label={r} selected={reason === r} onPress={() => pickReason(r)} />
            ))}
          </View>
          <View
            style={{
              marginTop: 22,
              padding: 18,
              borderRadius: 20,
              backgroundColor: tint(tokens.danger, 0.09),
              borderWidth: 1,
              borderColor: tint(tokens.danger, 0.22),
            }}
          >
            {roast ? (
              <ThemedText type="subheading" style={{ fontSize: 17 }}>
                {roast}
              </ThemedText>
            ) : (
              <ThemedText type="subheading" style={{ fontSize: 17 }}>
                <ThemedText type="subheading" style={{ fontSize: 17 }} color="danger">
                  “{reason}.”
                </ThemedText>{' '}
                This breaks your streak.
              </ThemedText>
            )}
          </View>
          {error ? (
            <ThemedText type="caption" color="danger" style={{ marginTop: 12 }}>
              {error}
            </ThemedText>
          ) : null}
        </>
      ) : (
        <ThemedText type="body" color="muted" style={{ marginTop: 16 }}>
          Logged. Counts against your streak. Get it tomorrow.
        </ThemedText>
      )}
    </ScreenLayout>
  );
}

/** Selectable reason pill — tokens only (not a CTA button). */
function ReasonChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: selected ? tint(tokens.accent1, 0.08) : tokens.surface,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? tokens.accent1 : tokens.rim,
      }}
    >
      <ThemedText type="body" color={selected ? 'accent1' : 'fg'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
