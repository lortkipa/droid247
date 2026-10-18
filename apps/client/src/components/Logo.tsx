import Svg, { G, Path, Rect } from 'react-native-svg';

import { brand, useTheme } from '@/lib/theme';

/**
 * The Cursor Droid mark. Geometry copied from brand/logo/svg/mark.svg; the
 * cursor is Ink on light backgrounds and White on dark ones (mark-dark.svg).
 */
export function Logo({ size = 36 }: { size?: number }) {
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
        <Rect x={3.5} y={25} width={9.5} height={19.5} rx={4.75} fill={brand.signalOrange} />
        <Rect x={17.0} y={25} width={9.5} height={19.5} rx={4.75} fill={brand.signalOrange} />
      </G>
    </Svg>
  );
}
