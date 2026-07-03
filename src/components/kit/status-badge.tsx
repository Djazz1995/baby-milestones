import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { tokens, tint } from '@/theme/tokens';

/**
 * Today's status for a goal. Always a colored dot + text label (never
 * color-only). Done=success, Due=info, Skipped=danger, Off=off.
 */
export type GoalStatus = 'done' | 'due' | 'skipped' | 'off';

const MAP: Record<GoalStatus, { color: string; label: string }> = {
  done: { color: tokens.success, label: 'Done' },
  due: { color: tokens.info, label: 'Due' },
  skipped: { color: tokens.danger, label: 'Skipped' },
  off: { color: tokens.off, label: 'Off today' },
};

export function StatusBadge({ status }: { status: GoalStatus }) {
  const { color, label } = MAP[status];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: tint(color, 0.15),
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <ThemedText type="eyebrow" style={{ color, letterSpacing: 0.66 }}>
        {label}
      </ThemedText>
    </View>
  );
}
