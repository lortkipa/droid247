import type { ReactNode } from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { brand, useTheme } from '@/lib/theme';

/** Eye expressions from brand/logo/svg/expressions/, for the agent's state. */
export type Expression = 'idle' | 'working' | 'done';

/**
 * The Cursor Droid mark. Geometry copied from brand/logo/svg/mark.svg; the
 * cursor is Ink on light backgrounds and White on dark ones (mark-dark.svg).
 * The eyes follow `expression` (the expression SVGs share the cursor's
 * coordinates, so their eye shapes are copied as is).
 */
export function Logo({ size = 36, expression = 'idle' }: { size?: number; expression?: Expression }) {
  const { logo } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Droid247">
      <G transform="translate(61 61) scale(1.18) translate(-24 -36.25)">
        <Path
          d="M0 0L0 66L16.5 52.5L27 74.5L39.5 68.5L29.5 47L53 46Z"
          fill={logo}
          stroke={logo}
          strokeWidth={10}
          strokeLinejoin="round"
        />
        {eyes[expression]}
      </G>
    </Svg>
  );
}

const eyes = {
  idle: (
    <>
      <Rect x={3.5} y={25} width={9.5} height={19.5} rx={4.75} fill={brand.signalOrange} />
      <Rect x={17.0} y={25} width={9.5} height={19.5} rx={4.75} fill={brand.signalOrange} />
    </>
  ),
  // Looking up, at the work.
  working: (
    <>
      <Rect x={2.5} y={21} width={9.5} height={16.5} rx={4.75} fill={brand.signalOrange} />
      <Rect x={16.0} y={21} width={9.5} height={16.5} rx={4.75} fill={brand.signalOrange} />
    </>
  ),
  // Smiling arcs.
  done: (
    <Path
      d="M3.25 37.75Q8.25 26.75 13.25 37.75M16.75 37.75Q21.75 26.75 26.75 37.75"
      fill="none"
      stroke={brand.signalOrange}
      strokeWidth={4.5}
      strokeLinecap="round"
    />
  ),
} satisfies Record<Expression, ReactNode>;
