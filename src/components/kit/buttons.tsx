import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { tokens, tint } from '@/theme/tokens';

type BaseProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  loading?: boolean;
  /** Optional leading element (e.g. an <Icon/>). */
  icon?: React.ReactNode;
};

const HEIGHT = 54;

function ButtonShell({
  title,
  loading,
  icon,
  disabled,
  bg,
  border,
  textColor,
  ...rest
}: BaseProps & { bg: string; border?: string; textColor: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={{
        height: HEIGHT,
        borderRadius: 16,
        backgroundColor: bg,
        borderWidth: border ? 1 : 0,
        borderColor: border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <ThemedText type="bodyStrong" style={{ color: textColor, fontWeight: '700' }}>
            {title}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** Solid fire CTA — dark text. The only "filled" button. Never a gradient. */
export function PrimaryButton(props: BaseProps) {
  return <ButtonShell {...props} bg={tokens.accentSolid} textColor={tokens.accentText} />;
}

/** Neutral secondary — surface-2 fill, hairline rim, white text. */
export function GhostButton(props: BaseProps) {
  return <ButtonShell {...props} bg={tokens.surface2} border={tokens.rim} textColor={tokens.fg} />;
}

/** Low-emphasis destructive — danger tint, shorter, used for "Skip anyway". */
export function DangerButton({ title, disabled, ...rest }: BaseProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={{
        height: 46,
        borderRadius: 14,
        backgroundColor: tint(tokens.danger, 0.12),
        borderWidth: 1,
        borderColor: tint(tokens.danger, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
      {...rest}
    >
      <ThemedText type="label" style={{ color: tokens.danger, fontWeight: '600', fontSize: 14 }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

/** A plain text link/action row (Edit · Pause · I can't today). */
export function TextButton({
  title,
  color = tokens.muted,
  ...rest
}: Omit<PressableProps, 'children'> & { title: string; color?: string }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} {...rest}>
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.6 : 1 }}>
          <ThemedText type="label" style={{ color, fontWeight: '600' }}>
            {title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}
