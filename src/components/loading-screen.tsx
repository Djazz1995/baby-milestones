import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { BruteLogo } from '@/components/brute-logo';
import { ThemedText } from '@/components/themed-text';
import { tokens } from '@/theme/tokens';

/**
 * The in-app loading screen (NOT the launch splash — that's the static native
 * expo-splash-screen). Logo lockup, a soft glow, three pulsing dots, and the
 * behavior-not-person loading line.
 */
export function LoadingScreen({ error }: { error?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      {/* soft radial-ish glow behind the mark */}
      <View
        style={{
          position: 'absolute',
          width: 340,
          height: 340,
          borderRadius: 170,
          backgroundColor: tokens.accentSolid,
          opacity: 0.1,
        }}
      />
      <BruteLogo size={96} />
      <ThemedText type="hero" style={{ fontSize: 42, marginTop: 22 }}>
        brute
      </ThemedText>

      {error ? (
        <ThemedText type="body" color="muted" style={{ marginTop: 34, textAlign: 'center' }}>
          Couldn’t start a session. {error}
        </ThemedText>
      ) : (
        <View style={{ marginTop: 34, alignItems: 'center', gap: 16 }}>
          <PulsingDots />
          <ThemedText type="body" color="muted" style={{ fontSize: 14 }}>
            loading your excuses…
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function PulsingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[0, 150, 300].map((delay) => (
        <Dot key={delay} delay={delay} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 480, useNativeDriver: true }),
        Animated.delay(300 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);

  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: tokens.accent1,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }}
    />
  );
}
