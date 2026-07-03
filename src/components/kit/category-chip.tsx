import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CATEGORY_LABEL, CategoryIcon } from '@/components/kit/icons';
import type { GoalCategory } from '@/models/goal';
import { tokens } from '@/theme/tokens';

/**
 * The category pill: surface-2 tint, hairline rim, category glyph + uppercase
 * tracked label. One treatment for every category everywhere.
 */
export function CategoryChip({ category }: { category: GoalCategory }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingLeft: 7,
        paddingRight: 9,
        borderRadius: 999,
        backgroundColor: tokens.surface2,
        borderWidth: 1,
        borderColor: tokens.rim,
      }}
    >
      <CategoryIcon category={category} size={12} color={tokens.muted} />
      <ThemedText type="eyebrow" color="muted">
        {CATEGORY_LABEL[category]}
      </ThemedText>
    </View>
  );
}
