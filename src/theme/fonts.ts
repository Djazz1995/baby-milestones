/**
 * Bricolage Grotesque — the display/wordmark family, bundled via expo-font.
 * Body/UI text stays on the system sans (fontFamily left undefined).
 *
 * The .ttf files live in assets/fonts and are registered once in the root
 * layout (`useFonts(bricolageFonts)`). Reference weights via the `Display`
 * map so a family string is never hardcoded in a screen or component.
 */

export const bricolageFonts = {
  'Bricolage-SemiBold': require('@/assets/fonts/BricolageGrotesque-SemiBold.ttf'),
  'Bricolage-Bold': require('@/assets/fonts/BricolageGrotesque-Bold.ttf'),
  'Bricolage-ExtraBold': require('@/assets/fonts/BricolageGrotesque-ExtraBold.ttf'),
} as const;

export const Display = {
  semibold: 'Bricolage-SemiBold',
  bold: 'Bricolage-Bold',
  extrabold: 'Bricolage-ExtraBold',
} as const;
