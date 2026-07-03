import { View } from 'react-native';

import { BruteFlame } from '@/components/brute-logo';
import { ThemedText } from '@/components/themed-text';
import { tokens } from '@/theme/tokens';

/**
 * A streak count: the brute flame + a solid accent-1 number. When the streak
 * is 0 the flame dims to `off` and the number goes muted.
 */
export function StreakFlame({
  count,
  size = 16,
  textSize = 17,
}: {
  count: number;
  size?: number;
  textSize?: number;
}) {
  const dead = count <= 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <BruteFlame size={size} color={dead ? tokens.off : undefined} />
      <ThemedText
        type="stat"
        style={{ fontSize: textSize, color: dead ? tokens.muted : tokens.accent1 }}
      >
        {count}
      </ThemedText>
    </View>
  );
}
