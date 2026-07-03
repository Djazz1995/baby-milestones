import { useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { BruteFlame } from '@/components/brute-logo';
import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Icon, PrimaryButton } from '@/components/kit';
import { shareService } from '@/services/shareService';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Roast line to render on the card. */
  text: string;
  /** Goal name for the card footer (optional). */
  goalName?: string;
  /** Day number in the goal's run, for the top-right meta (optional). */
  day?: number;
  /** Current streak length, shown in the footer (optional). */
  streak?: number;
};

const SHARE_TARGETS = ['Instagram', 'TikTok', 'X', 'WhatsApp'] as const;

/**
 * Renders a watermarked roast card (§4.8) and exports it as an image to the
 * system share sheet (IG / TikTok / X / WhatsApp). The card View is captured
 * with react-native-view-shot; sharing is native-only.
 */
export function ShareCardScreen({ text, goalName, day, streak }: Props) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const canShare = Platform.OS !== 'web';

  const today = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  async function onShare() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await shareService.exportImage(uri);
    } catch (e) {
      Alert.alert('Could not share', (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenLayout
      edges={['bottom']}
      footer={
        canShare ? (
          <PrimaryButton
            title="Share"
            icon={<Icon name="share" size={18} color={tokens.accentText} strokeWidth={2.3} />}
            onPress={onShare}
            loading={busy}
          />
        ) : undefined
      }
    >
      {/* The captured card. collapsable={false} so it's a real native view. */}
      <View
        ref={cardRef}
        collapsable={false}
        style={{
          backgroundColor: tokens.surface,
          borderWidth: 1,
          borderColor: tokens.rim,
          borderRadius: 24,
          paddingTop: 28,
          paddingHorizontal: 24,
          paddingBottom: 22,
          minHeight: 340,
          marginTop: 8,
          position: 'relative',
          overflow: 'hidden',
          justifyContent: 'space-between',
        }}
      >
        <BruteFlame
          size={220}
          style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.08 }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText type="wordmark" style={{ fontSize: 15 }}>
            brute
          </ThemedText>
          {day != null ? (
            <ThemedText type="caption" color="muted">
              day {day}
            </ThemedText>
          ) : null}
        </View>

        <ThemedText type="heading" style={{ fontSize: 26, lineHeight: 32, marginVertical: 20 }}>
          {text}
        </ThemedText>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: tokens.rim,
            paddingTop: 8,
          }}
        >
          {streak != null ? (
            <ThemedText type="caption" color="muted">
              streak <ThemedText type="caption" color="accent1">{streak}</ThemedText> days
            </ThemedText>
          ) : (
            <ThemedText type="caption" color="muted">
              {goalName ?? 'roastmode.app'}
            </ThemedText>
          )}
          <ThemedText type="caption" color="muted">
            {today}
          </ThemedText>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 28,
          paddingHorizontal: 4,
        }}
      >
        {SHARE_TARGETS.map((label) => (
          <View key={label} style={{ alignItems: 'center', gap: 8 }}>
            <View
              onTouchEnd={canShare ? onShare : undefined}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: tokens.surface,
                borderWidth: 1,
                borderColor: tokens.rim,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="share" size={20} color={tokens.fg} />
            </View>
            <ThemedText type="caption" color="muted">
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      {!canShare ? (
        <ThemedText type="caption" color="muted" style={{ textAlign: 'center', marginTop: 20 }}>
          Sharing works on the iOS/Android app. Screenshot for now.
        </ThemedText>
      ) : null}
    </ScreenLayout>
  );
}
