import type { ReactNode } from 'react';
import { View } from 'react-native';

import { BruteLogo } from '@/components/brute-logo';
import { ThemedText } from '@/components/themed-text';

/**
 * The tab-screen header: the brute lockup (logo + wordmark) on the left and an
 * optional right slot (e.g. a streak pill). No nav icons — navigation is the
 * bottom tab bar only.
 */
export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <BruteLogo size={26} />
        <ThemedText type="wordmark">brute</ThemedText>
      </View>
      {right}
    </View>
  );
}
