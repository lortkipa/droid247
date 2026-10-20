import type { ReactNode } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

/**
 * Line icons on a 24px grid, drawn the same on every platform. Shapes are from
 * Lucide (lucide.dev, ISC licence).
 */
const shapes = {
  plus: (
    <>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </>
  ),
  'arrow-up': (
    <>
      <Path d="m5 12 7-7 7 7" />
      <Path d="M12 19V5" />
    </>
  ),
  copy: (
    <>
      <Rect x={8} y={8} width={14} height={14} rx={2} ry={2} />
      <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  check: <Path d="M20 6 9 17l-5-5" />,
  volume: (
    <>
      <Path d="M11 5 6 9H2v6h4l5 4V5z" />
      <Path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  retry: (
    <>
      <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <Path d="M3 3v5h5" />
    </>
  ),
  pencil: (
    <>
      <Path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <Path d="m15 5 4 4" />
    </>
  ),
  file: (
    <>
      <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <Path d="M10 9H8" />
      <Path d="M16 13H8" />
      <Path d="M16 17H8" />
    </>
  ),
  x: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  settings: (
    <>
      <Path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <Circle cx={12} cy={12} r={3} />
    </>
  ),
  'panel-left': (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Path d="M9 3v18" />
    </>
  ),
  menu: (
    <>
      <Path d="M4 5h16" />
      <Path d="M4 12h16" />
      <Path d="M4 19h16" />
    </>
  ),
} satisfies Record<string, ReactNode>;

/** Filled square, for "stop" (a reply being written). */
const stop = <Rect x={6} y={6} width={12} height={12} rx={2} />;

export type IconName = keyof typeof shapes | 'stop';

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" pointerEvents="none">
      {name === 'stop' ? (
        <G fill={color}>{stop}</G>
      ) : (
        <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {shapes[name]}
        </G>
      )}
    </Svg>
  );
}
