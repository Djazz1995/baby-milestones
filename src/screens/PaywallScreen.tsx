import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Card, Icon, PrimaryButton, TextButton } from '@/components/kit';
import { useBilling } from '@/hooks/use-billing';
import { tokens, tint } from '@/theme/tokens';

const PERKS = [
  'Up to 5 goals',
  'Unhinged mode (Level 4)',
  'Accountability buddy',
  'More streak freezes',
];

/**
 * Upgrade screen (§12). Reached only when a gate blocks a free user (the
 * blocking reason is passed as the `reason` param). Purchase is a stub
 * (BillingService) until real IAP is wired.
 */
export function PaywallScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { purchase, purchasing } = useBilling();

  async function onUpgrade() {
    try {
      await purchase();
      Alert.alert('You’re in 🔥', 'Paid features unlocked.', [
        { text: 'Nice', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Purchase failed', (e as Error).message);
    }
  }

  return (
    <ScreenLayout
      edges={['bottom']}
      footer={
        <View style={{ gap: 12 }}>
          <PrimaryButton title="Upgrade" onPress={onUpgrade} loading={purchasing} />
          <View style={{ alignItems: 'center' }}>
            <TextButton title="Maybe later" onPress={() => router.back()} />
          </View>
        </View>
      }
    >
      <Stack.Screen options={{ title: 'Upgrade' }} />

      <ThemedText type="title" style={{ marginTop: 8 }}>
        Go{' '}
        <ThemedText type="title" color="accent1">
          Unhinged
        </ThemedText>
      </ThemedText>

      {reason ? (
        <ThemedText type="body" color="muted" style={{ marginTop: 8 }}>
          {reason}
        </ThemedText>
      ) : null}

      <View style={{ gap: 10, marginTop: 24 }}>
        {PERKS.map((p) => (
          <Card key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                backgroundColor: tint(tokens.success, 0.14),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={16} color={tokens.success} strokeWidth={2.4} />
            </View>
            <ThemedText type="bodyStrong">{p}</ThemedText>
          </Card>
        ))}
      </View>

      <ThemedText type="caption" color="muted" style={{ textAlign: 'center', marginTop: 20 }}>
        $2.99/mo or $14.99/yr
      </ThemedText>
    </ScreenLayout>
  );
}
