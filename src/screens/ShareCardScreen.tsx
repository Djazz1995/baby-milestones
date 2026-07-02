import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { shareService } from '@/services/shareService';

type Props = {
  /** Roast line to render on the card. */
  text: string;
  /** Goal name for the card footer (optional). */
  goalName?: string;
};

/**
 * Renders a watermarked roast card (§4.8) and exports it as an image to the
 * system share sheet (IG / TikTok / X / WhatsApp). The card View is captured
 * with react-native-view-shot; sharing is native-only.
 */
export function ShareCardScreen({ text, goalName }: Props) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const canShare = Platform.OS !== 'web';

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
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Share Roast' }} />
      <View style={styles.content}>
        {/* The captured card. collapsable={false} so it's a real native view. */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <ThemedText style={styles.brand}>🔥 brute</ThemedText>
          <ThemedText style={styles.cardText}>{text}</ThemedText>
          <View style={styles.cardFooter}>
            <ThemedText style={styles.watermark}>
              {goalName ? `${goalName} · ` : ''}roastmode.app
            </ThemedText>
          </View>
        </View>

        {canShare ? (
          <Button title="Share" onPress={onShare} loading={busy} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.webNote}>
            Sharing works on the iOS/Android app. Screenshot for now.
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.three, gap: Spacing.four, justifyContent: 'center' },
  card: {
    backgroundColor: '#15131f',
    borderRadius: Spacing.four,
    padding: Spacing.five,
    gap: Spacing.four,
    minHeight: 280,
    justifyContent: 'space-between',
  },
  brand: { color: '#ff6a3d', fontSize: 18, fontWeight: '700' },
  cardText: { color: '#ffffff', fontSize: 24, fontWeight: '700', lineHeight: 32 },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3a3650',
    paddingTop: Spacing.three,
  },
  watermark: { color: '#8b86a8', fontSize: 13 },
  webNote: { textAlign: 'center' },
});
