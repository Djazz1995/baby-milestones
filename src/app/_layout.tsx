import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal', title: 'Welcome' }} />
        <Stack.Screen name="goal/new" options={{ presentation: 'modal', title: 'New Goal' }} />
        <Stack.Screen name="goal/[id]/index" options={{ title: 'Goal' }} />
        <Stack.Screen name="goal/[id]/edit" options={{ title: 'Edit Goal' }} />
        <Stack.Screen
          name="goal/[id]/skip"
          options={{ presentation: 'modal', title: "I can't today" }}
        />
        <Stack.Screen
          name="goal/[id]/complete"
          options={{ presentation: 'modal', title: 'Done' }}
        />
        <Stack.Screen name="buddy" options={{ title: 'Accountability Buddy' }} />
        <Stack.Screen name="share/[cardId]" options={{ presentation: 'modal', title: 'Share' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', title: 'Upgrade' }} />
      </Stack>
    </ThemeProvider>
  );
}
