import { StyleSheet } from 'react-native';

/** Messages and the composer share one centred column, so replies are exactly as wide as the input. */
export const CHAT_MAX_WIDTH = 768;

export const chatLayout = StyleSheet.create({
  column: { width: '100%', maxWidth: CHAT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 16 },
});
