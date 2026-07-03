import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { tokens, tint } from '@/theme/tokens';

/**
 * A modal sheet with a dark scrim — used for the completion verdict. Tapping
 * the scrim dismisses. Content sits in a surface-2 card with a rim.
 */
export function Sheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: tint('#0c0a10', 0.72),
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        {/* Stop propagation so taps inside the card don't dismiss. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: tokens.surface2,
            borderWidth: 1,
            borderColor: tokens.rim,
            borderRadius: 24,
            paddingTop: 36,
            paddingHorizontal: 28,
            paddingBottom: 28,
            alignItems: 'center',
            gap: 20,
          }}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
