import Svg, { Circle, Path, type SvgProps } from 'react-native-svg';

import type { GoalCategory } from '@/models/goal';
import { tokens } from '@/theme/tokens';

/**
 * The single line-icon set, drawn to match the approved mocks. Stroke icons
 * inherit `color` (defaults to muted). Never inline an SVG path in a screen —
 * add it here and reference by name.
 */

type IconName =
  | 'plus'
  | 'close'
  | 'check'
  | 'chevron'
  | 'chevronLeft'
  | 'share'
  | 'edit'
  | 'pause'
  | 'bell'
  | 'trash'
  | 'userPlus';

const UI_PATHS: Record<IconName, string> = {
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M4 12.5 9.5 18 20 6',
  chevron: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  edit: 'M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17v3ZM13.5 6.5l3 3',
  pause: 'M9 5v14M15 5v14',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  userPlus: 'M15 20a5 5 0 0 0-10 0M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M18 8v6M21 11h-6',
};

export function Icon({
  name,
  size = 20,
  color = tokens.muted,
  strokeWidth = 2,
  ...rest
}: Omit<SvgProps, 'name'> & {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <Path
        d={UI_PATHS[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Category glyphs — two-path ones need their own component, so store as a
// render fn keyed by category.
const CAT: Record<GoalCategory, (p: { color: string; sw: number }) => React.ReactNode> = {
  gym: ({ color, sw }) => (
    <>
      <Path
        d="M6.5 6.5 4 4M17.5 17.5 20 20M2 9l3-3M22 15l-3 3M8 4 4 8M20 16l-4 4"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m14.5 6.5-4 4 3 3 4-4-3-3ZM4.5 14.5l4-4 1.5 1.5-4 4-1.5-1.5Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  study: ({ color, sw }) => (
    <>
      <Path
        d="M4 5.5C6 4.5 8.5 4 12 5.5c3.5-1.5 6-1 8 0v13c-2-1-4.5-1.5-8 0-3.5-1.5-6-1-8 0v-13Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 5.5v13" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  chores: ({ color, sw }) => (
    <>
      <Path d="M8 6h12M8 12h12M8 18h12" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M4 6h.01M4 12h.01M4 18h.01" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),
  diet: ({ color, sw }) => (
    <Path
      d="M12 8c-3 0-6 2.5-6 7 0 3 2 6 4 6s1.5-1.5 2-1.5S13.5 21 15.5 21c2 0 4-3 4-6 0-4.5-3-7-6-7 0-2 .5-3.5 2-4.5"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  water: ({ color, sw }) => (
    <Path
      d="M12 3c3.5 4.5 6 8 6 11a6 6 0 1 1-12 0c0-3 2.5-6.5 6-11Z"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  sleep: ({ color, sw }) => (
    <Path
      d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  custom: ({ color, sw }) => (
    <>
      <Path
        d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={sw} />
    </>
  ),
};

export function CategoryIcon({
  category,
  size = 12,
  color = tokens.muted,
  strokeWidth = 2,
}: {
  category: GoalCategory;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {CAT[category]({ color, sw: strokeWidth })}
    </Svg>
  );
}

export const CATEGORY_LABEL: Record<GoalCategory, string> = {
  gym: 'Gym',
  study: 'Study',
  chores: 'Chores',
  diet: 'Diet',
  water: 'Water',
  sleep: 'Sleep',
  custom: 'Custom',
};
