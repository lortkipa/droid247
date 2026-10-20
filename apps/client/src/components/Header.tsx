import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/Logo';

export const HEADER_HEIGHT = 52;

/**
 * Top bar of every screen: the logo, top left. Signed-in screens pass their
 * own `left` content instead (the mark is on the sidebar's Droid tab there).
 */
export function Header({ left = <Logo /> }: { left?: ReactNode }) {
  return <View style={styles.header}>{left}</View>;
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
});
