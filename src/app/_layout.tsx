import '@/global.css';

import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';

import { LoadingScreen } from '@/components/loading-screen';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { bricolageFonts, Display } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';

/** Navigation theme wired to the design tokens. */
const navTheme = {
  dark: true,
  colors: {
    primary: tokens.accent1,
    background: tokens.bg,
    card: tokens.bg,
    text: tokens.fg,
    border: tokens.rim,
    notification: tokens.accentSolid,
  },
  fonts: {
    regular: { fontFamily: Display.semibold, fontWeight: '400' as const },
    medium: { fontFamily: Display.semibold, fontWeight: '500' as const },
    bold: { fontFamily: Display.bold, fontWeight: '700' as const },
    heavy: { fontFamily: Display.extrabold, fontWeight: '800' as const },
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts(bricolageFonts);

  return (
    <GluestackUIProvider mode="dark">
      <ThemeProvider value={navTheme}>
        {!fontsLoaded ? (
          <LoadingScreen />
        ) : (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: tokens.bg },
              headerTintColor: tokens.fg,
              headerTitleStyle: { fontFamily: Display.bold, color: tokens.fg },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: tokens.bg },
            }}
          >
            <Stack.Screen name="index" options={{ title: 'Baby Milestones' }} />
          </Stack>
        )}
      </ThemeProvider>
    </GluestackUIProvider>
  );
}
