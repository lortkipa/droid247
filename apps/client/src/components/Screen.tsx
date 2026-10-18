import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { useTheme } from '@/lib/theme';

const HEADER_HEIGHT = 52;

/** Page frame shared by every screen: logo top left, content centred in a column. */
export function Screen({ children, maxWidth = 360 }: { children: ReactNode; maxWidth?: number }) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Logo />
      </View>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'web' ? undefined : 'padding'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          // iOS otherwise bounces pages that don't scroll; web never does.
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.column, { maxWidth }]}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    // Balances the header so the column sits in the middle of the whole screen.
    paddingBottom: 24 + HEADER_HEIGHT,
  },
  column: { width: '100%' },
});
