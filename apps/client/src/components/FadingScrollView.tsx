import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTransition } from '@/lib/use-transition';

type Props = ScrollViewProps & {
  /**
   * Colour behind the scroll view, as #RRGGBB. Content fades into it near an
   * edge that has more content beyond it, instead of being cut off hard.
   */
  fadeColor: string;
  /** Length of the fade in pixels. */
  fadeSize?: number;
  /** Style of the wrapper that holds the scroll view and the fades. */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Web, horizontal only: a vertical mouse wheel scrolls sideways (mice have
   * no horizontal wheel). Off by default so code blocks and tables don't
   * capture the wheel while the page scrolls past them.
   */
  wheelScrollsSideways?: boolean;
  ref?: Ref<ScrollView>;
};

type Edges = { start: boolean; end: boolean };

/** ScrollView whose edges fade out while there is hidden content past them. */
export function FadingScrollView({
  fadeColor,
  fadeSize = 24,
  containerStyle,
  horizontal = false,
  wheelScrollsSideways = false,
  onScroll,
  onLayout,
  onContentSizeChange,
  ref,
  ...props
}: Props) {
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });
  const metrics = useRef({ offset: 0, viewport: 0, content: 0 });
  const scrollRef = useRef<ScrollView | null>(null);
  const setRefs = useCallback(
    (node: ScrollView | null) => {
      scrollRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: ScrollView | null }).current = node;
    },
    [ref],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !horizontal || !wheelScrollsSideways) return;
    // react-native-web: the scrolling DOM element.
    const node = scrollRef.current?.getScrollableNode() as HTMLElement | null | undefined;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      // Trackpads already scroll sideways; only translate a mostly vertical wheel.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = node.scrollWidth - node.clientWidth;
      const next = Math.min(max, Math.max(0, node.scrollLeft + e.deltaY));
      // At either end, let the page scroll as usual.
      if (next === node.scrollLeft) return;
      e.preventDefault();
      node.scrollLeft = next;
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [horizontal, wheelScrollsSideways]);

  const update = useCallback(() => {
    const { offset, viewport, content } = metrics.current;
    const start = offset > 1;
    const end = offset + viewport < content - 1;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  return (
    <View style={containerStyle}>
      <ScrollView
        ref={setRefs}
        horizontal={horizontal}
        scrollEventThrottle={16}
        {...props}
        onScroll={(e) => {
          const { x, y } = e.nativeEvent.contentOffset;
          metrics.current.offset = horizontal ? x : y;
          update();
          onScroll?.(e);
        }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          metrics.current.viewport = horizontal ? width : height;
          update();
          onLayout?.(e);
        }}
        onContentSizeChange={(width, height) => {
          metrics.current.content = horizontal ? width : height;
          update();
          onContentSizeChange?.(width, height);
        }}
      />
      <EdgeFade side={horizontal ? 'left' : 'top'} visible={edges.start} color={fadeColor} size={fadeSize} />
      <EdgeFade side={horizontal ? 'right' : 'bottom'} visible={edges.end} color={fadeColor} size={fadeSize} />
    </View>
  );
}

type Side = 'top' | 'bottom' | 'left' | 'right';

const gradientDirection: Record<Side, { start: { x: number; y: number }; end: { x: number; y: number } }> = {
  top: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  bottom: { start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
  left: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  right: { start: { x: 1, y: 0 }, end: { x: 0, y: 0 } },
};

function EdgeFade({ side, visible, color, size }: { side: Side; visible: boolean; color: string; size: number }) {
  const opacity = useTransition(visible, { useNativeDriver: Platform.OS !== 'web' });
  const vertical = side === 'top' || side === 'bottom';
  const position: ViewStyle = vertical
    ? { left: 0, right: 0, height: size, [side]: 0 }
    : { top: 0, bottom: 0, width: size, [side]: 0 };

  return (
    <Animated.View pointerEvents="none" style={[styles.fade, position, { opacity }]}>
      <LinearGradient
        // Fully transparent version of the same colour, so the fade doesn't pass through grey.
        colors={[color, `${color}00`]}
        {...gradientDirection[side]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute' },
});
