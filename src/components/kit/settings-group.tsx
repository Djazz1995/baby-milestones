import type { ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/kit/icons';
import { tokens } from '@/theme/tokens';

/**
 * iOS-style grouped settings. `SettingsSection` renders an uppercase header and
 * a rounded card; `SettingsRow`s inside get automatic hairline separators.
 */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ marginBottom: 24 }}>
      <ThemedText type="eyebrow" color="muted" style={{ paddingHorizontal: 8, paddingBottom: 8 }}>
        {title}
      </ThemedText>
      <View
        style={{
          backgroundColor: tokens.surface,
          borderWidth: 1,
          borderColor: tokens.rim,
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: tokens.rim, marginLeft: 16 }} /> : null}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  onPress,
  danger,
  right,
}: {
  label: string;
  /** Trailing muted value text (shown before the chevron). */
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  /** Custom trailing element (e.g. a <Toggle/>). Overrides chevron. */
  right?: ReactNode;
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <ThemedText type="body" style={{ fontSize: 16 }} color={danger ? 'danger' : 'fg'}>
        {label}
      </ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value ? (
          <ThemedText type="body" style={{ fontSize: 15 }} color="muted">
            {value}
          </ThemedText>
        ) : null}
        {right ?? (onPress ? <Icon name="chevron" size={16} color={tokens.off} /> : null)}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {body}
      </Pressable>
    );
  }
  return body;
}

/** A themed on/off switch matching the mock toggle. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{
        width: 51,
        height: 31,
        borderRadius: 16,
        padding: 2,
        backgroundColor: value ? tokens.accentSolid : tokens.surface2,
        borderWidth: 1,
        borderColor: value ? tokens.accentSolid : tokens.rim,
        alignItems: value ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 13,
          backgroundColor: tokens.fg,
        }}
      />
    </Pressable>
  );
}
