import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { chatLayout } from '@/components/chat/layout';
import { AppHeader } from '@/components/sidebar/AppShell';
import { typography, useTheme } from '@/lib/theme';

/** Settings. A placeholder for now. */
export default function SettingsScreen() {
  const theme = useTheme();

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={chatLayout.column}>
          <Text style={[typography.title, { color: theme.text }]} accessibilityRole="header">
            Settings
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 24 },
});
