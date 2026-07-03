import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { tokens } from '@/theme/tokens';

export type WeekDay = {
  key: string;
  /** Short weekday label, e.g. "Mon". */
  dow: string;
  /** Day-of-month number. */
  date: number;
  isToday?: boolean;
  selected?: boolean;
  /** Show a small activity dot under the date. */
  hasActivity?: boolean;
};

/**
 * The 7-day selector strip. The selected day reads as a solid-accent pill with
 * dark text; other days are surface cards.
 */
export function WeekStrip({ days, onSelect }: { days: WeekDay[]; onSelect?: (key: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {days.map((d) => {
        const active = d.selected;
        return (
          <Pressable
            key={d.key}
            onPress={() => onSelect?.(d.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: 14,
              backgroundColor: active ? tokens.accentSolid : tokens.surface,
              borderWidth: 1,
              borderColor: active ? tokens.accentSolid : tokens.rim,
            }}
          >
            <ThemedText
              type="caption"
              style={{ fontSize: 10, fontWeight: '600', color: active ? tokens.accentText : tokens.muted }}
            >
              {d.dow}
            </ThemedText>
            <ThemedText
              type="bodyStrong"
              style={{ fontSize: 15, fontWeight: '700', color: active ? tokens.accentText : tokens.fg }}
            >
              {d.date}
            </ThemedText>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                marginTop: 4,
                backgroundColor: d.hasActivity
                  ? active
                    ? tokens.accentText
                    : tokens.muted
                  : 'transparent',
                opacity: active ? 0.55 : 1,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
