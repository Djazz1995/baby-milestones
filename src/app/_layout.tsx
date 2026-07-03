import '@/global.css';

import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components/loading-screen';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { useSession } from '@/hooks/use-session';
import { useUser } from '@/hooks/use-user';
import { notificationService } from '@/services/notificationService';
import { bricolageFonts, Display } from '@/theme/fonts';
import { tokens } from '@/theme/tokens';

/** Dark-only navigation theme so pushed screens + headers match the brand. */
const bruteNavTheme = {
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
  const { ready, error } = useSession();
  useNotificationRouting();

  return (
    <GluestackUIProvider mode="dark">
      <ThemeProvider value={bruteNavTheme}>
        {!fontsLoaded || !ready ? (
          <LoadingScreen error={error?.message} />
        ) : (
          <RootNav />
        )}
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

/**
 * Mounted only after the session is ready (so `useUser` has an identity). Runs
 * the cold-start onboarding gate: a not-onboarded user is sent to the flow.
 */
function RootNav() {
  const router = useRouter();
  const { data: user } = useUser();

  useEffect(() => {
    if (user && !user.onboarded) router.replace('/onboarding');
  }, [user, router]);

  // Persist this device's push token so the server cron can reach it (§8.2).
  useEffect(() => {
    if (user?.onboarded) notificationService.syncPushToken();
  }, [user?.onboarded]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: tokens.bg },
        headerTintColor: tokens.fg,
        headerTitleStyle: { fontFamily: Display.bold, color: tokens.fg },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tokens.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="goal/new" options={{ presentation: 'modal', title: 'New Goal' }} />
      <Stack.Screen name="goal/[id]/index" options={{ title: 'Goal' }} />
      <Stack.Screen name="goal/[id]/edit" options={{ title: 'Edit Goal' }} />
      <Stack.Screen
        name="goal/[id]/skip"
        options={{ presentation: 'modal', title: "I can't today" }}
      />
      <Stack.Screen name="buddy" options={{ title: 'Accountability Buddy' }} />
      <Stack.Screen name="collections" options={{ title: 'Collections' }} />
      <Stack.Screen name="archived" options={{ title: 'Archived Goals' }} />
      <Stack.Screen name="share/[cardId]" options={{ presentation: 'modal', title: 'Share' }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal', title: 'Upgrade' }} />
    </Stack>
  );
}
