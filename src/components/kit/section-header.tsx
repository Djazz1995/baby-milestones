import { View } from 'react-native';

import { BruteFlame } from '@/components/brute-logo';
import { ThemedText } from '@/components/themed-text';
import { tokens } from '@/theme/tokens';

/**
 * A list section divider: uppercase tracked label + a hairline rule. The
 * `collection` variant tints the label accent-1 and prefixes the flame (used
 * for user-named goal collections on Home).
 */
export function SectionHeader({ label, collection }: { label: string; collection?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 22,
        marginBottom: 12,
      }}
    >
      {collection ? <BruteFlame size={13} /> : null}
      <ThemedText type="eyebrow" color={collection ? 'accent1' : 'muted'}>
        {label}
      </ThemedText>
      <View style={{ flex: 1, height: 1, backgroundColor: tokens.rim }} />
    </View>
  );
}
