import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { tokens } from '@/theme/tokens';

/**
 * Weekly-target / completion track. The fire gradient is allowed here (and on
 * the flame) — nowhere else. Height + radius fixed; `value` is 0..1.
 */
export function ProgressBar({ value, height = 6 }: { value: number; height?: number }) {
  const id = useId();
  const grad = `${id}-pg`;
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: tokens.surface2, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={tokens.accent1} />
            <Stop offset="1" stopColor={tokens.accent2} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={pct} height="10" rx="5" fill={`url(#${grad})`} />
      </Svg>
    </View>
  );
}
