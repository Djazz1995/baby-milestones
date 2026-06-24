import '@/global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { useSession } from '@/hooks/use-session';
import { useUser } from '@/hooks/use-user';
import { notificationService } from '@/services/notificationService';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { ready, error } = useSession();
  useNotificationRouting();

  return (
    <GluestackUIProvider mode={colorScheme === 'dark' ? 'dark' : 'light'}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {!ready ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            {error ? (
              <ThemedText type="small">Couldn’t start a session: {error.message}</ThemedText>
            ) : (
              <ActivityIndicator />
            )}
          </View>
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
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
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
