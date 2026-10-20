import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

export type ResizeHandleProps = {
  /** Shown as a line while hovered or dragged. */
  lineColor: string;
  onStart: () => void;
  /** Horizontal distance from where the drag started. */
  onMove: (dx: number) => void;
  onEnd: () => void;
};

/** Width of the drag strip over the sidebar's right edge. */
export const HANDLE_WIDTH = 8;

/** Drag strip on the sidebar's edge (tablets). The web has its own, see ResizeHandle.web.tsx. */
export function ResizeHandle(props: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  // The responder is created once; it calls the latest callbacks.
  const latest = useRef(props);
  latest.current = props;

  const responder = useMemo(() => {
    const end = () => {
      setDragging(false);
      latest.current.onEnd();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDragging(true);
        latest.current.onStart();
      },
      onPanResponderMove: (_, { dx }) => latest.current.onMove(dx),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, []);

  return (
    <View {...responder.panHandlers} accessibilityLabel="Resize sidebar" style={styles.handle}>
      <View style={[styles.line, { backgroundColor: dragging ? props.lineColor : 'transparent' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: -HANDLE_WIDTH / 2,
    width: HANDLE_WIDTH,
    alignItems: 'center',
  },
  line: { width: 2, height: '100%' },
});
