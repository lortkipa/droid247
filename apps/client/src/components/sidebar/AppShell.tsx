import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Header } from '@/components/Header';
import { IconButton } from '@/components/IconButton';
import { brand, useTheme } from '@/lib/theme';

import { SidebarContext, useDroidStatus, useSidebar } from './context';
import { DockedSidebar } from './DockedSidebar';
import { Drawer } from './Drawer';
import { DOCK_MIN_WINDOW } from './layout';

/**
 * Frame of the signed-in screens: the sidebar beside the screen on wide
 * windows, or a drawer over it on phones.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const docked = useWindowDimensions().width >= DOCK_MIN_WINDOW;
  const status = useDroidStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (docked) setDrawerOpen(false);
  }, [docked]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const value = useMemo(() => ({ docked, openDrawer, status }), [docked, openDrawer, status]);

  return (
    <SidebarContext.Provider value={value}>
      <View style={[styles.shell, { backgroundColor: theme.background }]}>
        {docked && <DockedSidebar />}
        {/* The docked sidebar covers the left inset itself. */}
        <SafeAreaView edges={docked ? ['top', 'right'] : ['top', 'left', 'right']} style={styles.content}>
          {children}
        </SafeAreaView>
        {!docked && <Drawer open={drawerOpen} onClose={closeDrawer} />}
      </View>
    </SidebarContext.Provider>
  );
}

/**
 * Top bar of the signed-in screens. On phones it holds the menu button, with
 * a dot while a finished reply is waiting in the chat.
 */
export function AppHeader() {
  const { docked, openDrawer, status } = useSidebar();
  if (docked) return <Header left={null} />;

  return (
    <Header
      left={
        <View style={styles.menu}>
          <IconButton icon="menu" label="Open menu" onPress={openDrawer} size={36} iconSize={22} />
          {status === 'done' && <View pointerEvents="none" style={styles.dot} />}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
  // Lines the icon up with the chat column's edge rather than the button's.
  menu: { marginLeft: -8, alignSelf: 'flex-start' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: brand.signalOrange,
  },
});
