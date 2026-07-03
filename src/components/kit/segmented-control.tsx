import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { tokens } from '@/theme/tokens';

/**
 * A single-select segmented control. Container = surface + rim, radius 14,
 * 4px inset. Selected segment = solid accent with dark text. Used for rudeness,
 * escalation, cadence, and any other small mutually-exclusive choice.
 */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: 14,
        backgroundColor: tokens.surface,
        borderWidth: 1,
        borderColor: tokens.rim,
        opacity: disabled ? 0.36 : 1,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 6,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? tokens.accentSolid : 'transparent',
            }}
          >
            <ThemedText
              type="label"
              numberOfLines={1}
              style={{
                fontWeight: '600',
                fontSize: 13,
                color: active ? tokens.accentText : tokens.muted,
              }}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}
