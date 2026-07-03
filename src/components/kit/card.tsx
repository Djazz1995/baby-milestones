import { Pressable, View, type ViewProps } from 'react-native';

import { tokens } from '@/theme/tokens';

/**
 * The card surface: surface bg + 1px rim + radius 20, NO shadow. Depth in this
 * UI comes from surface steps, not elevation. Pass `onPress` to make it tappable.
 */
export function Card({
  children,
  style,
  onPress,
  level = 1,
  ...rest
}: ViewProps & { onPress?: () => void; level?: 1 | 2 }) {
  const base = {
    backgroundColor: level === 2 ? tokens.surface2 : tokens.surface,
    borderWidth: 1,
    borderColor: tokens.rim,
    borderRadius: 20,
    padding: 16,
  } as const;

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[base, style]} {...rest}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
