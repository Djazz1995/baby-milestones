/** Shared goal-form primitives: Field wrapper, selectable category pill,
 *  themed input style. All presentation from design tokens (no raw hex). */

import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_LABEL } from '@/components/kit';
import type { GoalCategory } from '@/models';
import { tokens } from '@/theme/tokens';

/** A labelled field group. Label is a lowercase muted `label` per the mock. */
export function Field({
  label,
  children,
  gap = 10,
}: {
  label: string;
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <View style={{ gap }}>
      <ThemedText type="label" color="muted">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

/** A single selectable category pill (a form control, not the read-only CategoryChip). */
export function CategoryPill({
  category,
  active,
  onPress,
}: {
  category: GoalCategory;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        fieldStyles.catPill,
        active
          ? { backgroundColor: tokens.accentSolid, borderColor: tokens.accentSolid }
          : { backgroundColor: tokens.surface, borderColor: tokens.rim },
      ]}
    >
      <ThemedText
        type="eyebrow"
        style={{ color: active ? tokens.accentText : tokens.muted }}
      >
        {CATEGORY_LABEL[category]}
      </ThemedText>
    </Pressable>
  );
}

/** A horizontal wrap of selectable category pills. */
export function CategoryPillRow({
  options,
  selected,
  onSelect,
}: {
  options: readonly GoalCategory[];
  selected: GoalCategory;
  onSelect: (c: GoalCategory) => void;
}) {
  return (
    <View style={fieldStyles.wrap}>
      {options.map((c) => (
        <CategoryPill key={c} category={c} active={c === selected} onPress={() => onSelect(c)} />
      ))}
    </View>
  );
}

/** Themed TextInput style: surface-2 fill, 1px rim, radius 14, padding 16. */
export function useInputStyle(): StyleProp<TextStyle> {
  return fieldStyles.input;
}

export const fieldStyles = StyleSheet.create({
  input: {
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.rim,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: tokens.fg,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  // A generic tappable "surface2" row (time rows, buddy row, etc.).
  row: {
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.rim,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashedRow: {
    borderWidth: 1,
    borderColor: tokens.rim,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dayToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
