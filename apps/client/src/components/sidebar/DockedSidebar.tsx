import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { loadSidebarPrefs, saveSidebarPrefs } from '@/lib/sidebar-storage';
import { useTheme } from '@/lib/theme';
import { TRANSITION_MS } from '@/lib/use-transition';

import {
  AUTO_COLLAPSE_BELOW,
  clampWidth,
  COLLAPSE_BELOW,
  DEFAULT_WIDTH,
  RAIL_WIDTH,
} from './layout';
import { ResizeHandle } from './ResizeHandle';
import { Sidebar } from './Sidebar';

/**
 * The sidebar beside the content on wide windows. Drag its right edge to
 * resize it; dragging it narrow enough collapses it to icons, and dragging
 * the collapsed one out expands it. Width and state are remembered.
 */
export function DockedSidebar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const narrow = useWindowDimensions().width < AUTO_COLLAPSE_BELOW;

  const [saved] = useState(loadSidebarPrefs);
  const [width, setWidth] = useState(() => clampWidth(saved.width ?? DEFAULT_WIDTH));
  const [collapsed, setCollapsed] = useState(() => narrow || (saved.collapsed ?? false));
  const [dragging, setDragging] = useState(false);

  // The user's own choice, which a narrow window overrides only while it's narrow.
  const chosenCollapsed = useRef(saved.collapsed ?? false);
  const current = useRef({ width, collapsed });
  current.current = { width, collapsed };

  const wasNarrow = useRef(narrow);
  useEffect(() => {
    if (narrow === wasNarrow.current) return;
    wasNarrow.current = narrow;
    setCollapsed(narrow || chosenCollapsed.current);
  }, [narrow]);

  const remember = (prefs: { width: number; collapsed: boolean }) => {
    chosenCollapsed.current = prefs.collapsed;
    saveSidebarPrefs(prefs);
  };

  // Follows the pointer while dragging; animates collapsing and expanding.
  const shown = collapsed ? RAIL_WIDTH : width;
  const animatedWidth = useRef(new Animated.Value(shown)).current;
  const lastCollapsed = useRef(collapsed);
  useEffect(() => {
    const toggled = collapsed !== lastCollapsed.current;
    lastCollapsed.current = collapsed;
    if (dragging && !toggled) {
      animatedWidth.setValue(shown);
    } else {
      Animated.timing(animatedWidth, {
        toValue: shown,
        duration: TRANSITION_MS,
        useNativeDriver: false,
      }).start();
    }
  }, [shown, collapsed, dragging, animatedWidth]);

  // Where the current drag started from, and the width to return to if it collapses.
  const dragStart = useRef({ from: 0, width: DEFAULT_WIDTH });

  const onDragStart = () => {
    dragStart.current = { from: collapsed ? RAIL_WIDTH : width, width };
    setDragging(true);
  };

  const onDragMove = (dx: number) => {
    const next = dragStart.current.from + dx;
    if (next < COLLAPSE_BELOW) {
      setCollapsed(true);
      // Expanding again brings back the width it had before this drag.
      setWidth(dragStart.current.width);
    } else {
      setCollapsed(false);
      setWidth(clampWidth(next));
    }
  };

  const onDragEnd = () => {
    setDragging(false);
    remember(current.current);
  };

  const toggle = () => {
    const next = { width, collapsed: !collapsed };
    setCollapsed(next.collapsed);
    remember(next);
  };

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: theme.surface,
          borderRightColor: theme.border,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        },
      ]}
    >
      <Animated.View style={[styles.content, { width: animatedWidth }, !collapsed && styles.clip]}>
        <Sidebar
          collapsed={collapsed}
          topButton={{
            icon: 'panel-left',
            label: collapsed ? 'Expand sidebar' : 'Collapse sidebar',
            onPress: toggle,
          }}
        />
      </Animated.View>
      <ResizeHandle lineColor={theme.selection} onStart={onDragStart} onMove={onDragMove} onEnd={onDragEnd} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Above the content, so the collapsed sidebar's tooltips overlap it.
  dock: { zIndex: 2, borderRightWidth: StyleSheet.hairlineWidth },
  content: { flex: 1 },
  // Labels appear as the sidebar expands; keep them inside until it's wide enough.
  clip: { overflow: 'hidden' },
});
