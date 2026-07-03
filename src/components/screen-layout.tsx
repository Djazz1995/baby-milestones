import type { ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { tokens } from '@/theme/tokens';

/**
 * The ONE screen wrapper: app background + safe-area + the app's single
 * horizontal padding value. Every screen (tab or pushed) renders inside this,
 * so gutters and the canvas color are identical everywhere.
 */

export const SCREEN_PADDING = 20;

type ScreenLayoutProps = ViewProps & {
  children: ReactNode;
  /** Scroll the body. Default true. */
  scroll?: boolean;
  /** Which safe-area edges to inset. Pushed screens get a native header, so
   *  they usually omit 'top'. Defaults to top + bottom. */
  edges?: readonly Edge[];
  /** A pinned footer (e.g. a sticky CTA) that sits below the scroll area. */
  footer?: ReactNode;
  /** Remove the default horizontal padding (screen manages its own gutters). */
  noPadding?: boolean;
};

export function ScreenLayout({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  footer,
  noPadding,
  style,
  ...rest
}: ScreenLayoutProps) {
  const pad = noPadding ? undefined : { paddingHorizontal: SCREEN_PADDING };

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={[{ flex: 1 }, style]} {...rest}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[pad, { paddingBottom: 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, pad]}>{children}</View>
        )}
        {footer ? <View style={[pad, { paddingTop: 8, paddingBottom: 12 }]}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}
