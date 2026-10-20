import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTransition } from '@/lib/use-transition';

/** Room the text may take before it's cut; far more than any line it holds. */
const TRACK_WIDTH = 10000;

type Props = {
  children: string;
  /** Text style; its `lineHeight` sets the height of the line. */
  style: StyleProp<TextStyle>;
  /** Style of the box the text is cut to, e.g. `{ flex: 1 }` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Colour behind the text, as #RRGGBB. */
  fadeColor: string;
  /**
   * For backgrounds that fade between two colours (a row's hover fill): this
   * colour, as #RRGGBB, fades in over `fadeColor` with `overlayOpacity`.
   */
  overlayColor?: string;
  overlayOpacity?: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** Length of the fade in pixels. */
  fadeSize?: number;
};

/**
 * One line of text that fades out at its right edge when it doesn't fit,
 * instead of ending in "…", like the scroll views' edges.
 */
export function FadingText({
  children,
  style,
  containerStyle,
  fadeColor,
  overlayColor,
  overlayOpacity,
  fadeSize = 24,
}: Props) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const opacity = useTransition(textWidth > boxWidth + 0.5);
  const lineHeight = StyleSheet.flatten(style)?.lineHeight;

  return (
    <View
      style={[styles.box, { height: lineHeight }, containerStyle]}
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
    >
      {/* Wide enough that the text never wraps; the box cuts it off. */}
      <View pointerEvents="box-none" style={styles.track}>
        <Text style={[style, styles.text]} onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}>
          {children}
        </Text>
      </View>
      <Animated.View pointerEvents="none" style={[styles.fade, { width: fadeSize, opacity }]}>
        <Gradient color={fadeColor} />
        {overlayColor !== undefined && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayOpacity ?? 1 }]}>
            <Gradient color={overlayColor} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

function Gradient({ color }: { color: string }) {
  return (
    <LinearGradient
      // Fully transparent version of the same colour, so the fade doesn't pass through grey.
      colors={[`${color}00`, color]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  track: { position: 'absolute', top: 0, left: 0, width: TRACK_WIDTH, alignItems: 'flex-start' },
  text: { flexShrink: 0 },
  fade: { position: 'absolute', top: 0, bottom: 0, right: 0 },
});
