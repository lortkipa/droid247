import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/Logo';

export const HEADER_HEIGHT = 52;

/** Top bar of every screen: the logo, top left. */
export function Header() {
  return (
    <View style={styles.header}>
      <Logo />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
});
