import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { UserMessage as Message } from '@/lib/chat';
import { typography, useTheme } from '@/lib/theme';

import { AttachmentTile } from './AttachmentTile';

/** The user's message: attachments, then a blue bubble on the right. */
export const UserMessage = memo(function UserMessage({ message }: { message: Message }) {
  const theme = useTheme();

  return (
    <View style={styles.message}>
      {message.attachments.length > 0 && (
        <View style={styles.attachments}>
          {message.attachments.map((attachment) => (
            <AttachmentTile key={attachment.id} attachment={attachment} />
          ))}
        </View>
      )}
      {message.text.length > 0 && (
        <View style={[styles.bubble, { backgroundColor: theme.userBubble }]}>
          <Text selectable style={[typography.message, { color: theme.onUserBubble }]}>
            {message.text}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  message: { alignItems: 'flex-end', gap: 8 },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
