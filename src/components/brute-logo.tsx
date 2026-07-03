import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, type SvgProps } from 'react-native-svg';

import { tokens } from '@/theme/tokens';

/**
 * The brute mark — flame-in-speech-bubble — from assets/logo/mark-white.svg.
 * This is the ONLY logo in the app (header, splash, onboarding, share
 * watermark). Never redraw a flame inline; compose `BruteLogo` / `BruteFlame`.
 */

type LogoProps = Omit<SvgProps, 'viewBox'> & {
  size?: number;
  /** Bubble fill. Defaults to white (the wordmark/header lockup). */
  bubbleColor?: string;
  /** Draw only the bubble outline instead of a filled bubble (empty states). */
  outline?: boolean;
};

export function BruteLogo({ size = 26, bubbleColor = tokens.fg, outline, ...rest }: LogoProps) {
  const id = useId();
  const flame = `${id}-flame`;
  const core = `${id}-core`;
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" {...rest}>
      <Defs>
        <LinearGradient id={flame} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tokens.accent1} />
          <Stop offset="1" stopColor={tokens.accent2} />
        </LinearGradient>
        <LinearGradient id={core} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE479" />
          <Stop offset="1" stopColor="#FF8A1F" />
        </LinearGradient>
      </Defs>
      {outline ? (
        <G fill="none" stroke={tokens.rim} strokeWidth={22}>
          <Rect x={200} y={212} width={624} height={486} rx={118} />
          <Path d="M356 656 L300 800 L470 690 Z" />
        </G>
      ) : (
        <G fill={bubbleColor}>
          <Rect x={200} y={212} width={624} height={486} rx={118} />
          <Path d="M356 656 L300 800 L470 690 Z" />
        </G>
      )}
      <Path
        fill={`url(#${flame})`}
        d="M512 300 C556 372 636 410 636 500 A124 124 0 0 1 388 500 C388 452 424 416 424 416 C430 470 456 492 476 504 C440 430 484 356 512 300 Z"
      />
      <Path
        fill={`url(#${core})`}
        d="M512 420 C536 456 576 480 576 526 A64 64 0 0 1 448 526 C448 500 466 482 466 482 C470 508 486 520 500 528 C478 484 494 452 512 420 Z"
      />
    </Svg>
  );
}

/**
 * The bare flame — same art, no bubble — for streak badges, the tab flame, and
 * the share-card watermark. Gradient by default; pass `color` for a flat fill
 * (e.g. a dimmed `off` flame on a broken streak).
 */
export function BruteFlame({
  size = 16,
  color,
  ...rest
}: Omit<SvgProps, 'viewBox'> & { size?: number; color?: string }) {
  const id = useId();
  const flame = `${id}-f`;
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26" fill="none" {...rest}>
      {!color && (
        <Defs>
          <LinearGradient id={flame} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tokens.accent1} />
            <Stop offset="1" stopColor={tokens.accent2} />
          </LinearGradient>
        </Defs>
      )}
      <Path
        fill={color ?? `url(#${flame})`}
        d="M13 4c-3.4 3-5 5.4-5 8.1 0 3 2.4 5.1 5 5.1s5-2.1 5-5.1c0-1.05-.3-1.8-.75-2.7-.3.9-.9 1.5-1.65 1.5.3-2.4-.45-4.5-2.6-6.9Z"
      />
    </Svg>
  );
}
