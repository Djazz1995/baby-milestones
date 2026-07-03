import { StyleSheet, Text, type TextProps } from 'react-native';

import { Display } from '@/theme/fonts';
import { tokens, type TokenName } from '@/theme/tokens';

/**
 * The ONE type scale. Every piece of text in the app is a `<ThemedText>` with
 * a `type` — screens never set fontSize/fontFamily/fontWeight inline.
 *
 * Display variants (hero/title/heading/subheading/greeting/stat) render in
 * Bricolage Grotesque; text variants (body/label/caption/eyebrow) stay on the
 * system sans. Color defaults to `fg`; override with the `color` token prop.
 */
export type ThemedTextType =
  | 'hero' // 64/800 — splash + onboarding wordmark, big % stat
  | 'title' // 32/800 — screen titles (Settings)
  | 'heading' // 22/700 — card / sheet / section big headline
  | 'subheading' // 18/700 — day heading, mid titles
  | 'greeting' // 24/600 — home greeting
  | 'stat' // 22/800 — stat-card numbers
  | 'wordmark' // 22/700 — header wordmark
  | 'body' // 15/400 — default body copy
  | 'bodyStrong' // 15/600 — emphasized body
  | 'label' // 13/500 — form field labels, secondary
  | 'caption' // 12/500 — helper / meta
  | 'eyebrow'; // 11/600 uppercase tracked — section headers

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  /** A color token name. Defaults to `fg`. */
  color?: TokenName;
};

export function ThemedText({ style, type = 'body', color = 'fg', ...rest }: ThemedTextProps) {
  return <Text style={[{ color: tokens[color] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  hero: {
    fontFamily: Display.extrabold,
    fontSize: 64,
    lineHeight: 66,
    letterSpacing: -1.3,
  },
  title: {
    fontFamily: Display.extrabold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  heading: {
    fontFamily: Display.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: Display.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  greeting: {
    fontFamily: Display.semibold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.24,
  },
  stat: {
    fontFamily: Display.extrabold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  wordmark: {
    fontFamily: Display.bold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.44,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.88, // ~0.08em at 11px
    textTransform: 'uppercase',
  },
});
