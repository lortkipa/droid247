import { DisplayNameSchema } from '@droid247/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth, useAuthStage } from '@/lib/auth';
import { typography, useTheme } from '@/lib/theme';

export default function NameScreen() {
  const theme = useTheme();
  const { completeName, changeEmail, busy, error } = useAuth();
  const naming = useAuthStage('naming');
  const [name, setName] = useState(naming?.suggestedName ?? '');

  const parsed = DisplayNameSchema.safeParse(name);
  const submit = () => {
    if (parsed.success && !busy) void completeName(parsed.data);
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title, { color: theme.text }]}>What's your name?</Text>
      <View style={styles.form}>
        <TextField
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          placeholder="Name"
          accessibilityLabel="Name"
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          maxLength={100}
          returnKeyType="done"
        />
        <Button title="Continue" onPress={submit} disabled={!parsed.success || busy} />
        <Button
          title="Continue with a different Email"
          variant="secondary"
          onPress={() => void changeEmail()}
          disabled={busy}
        />
        {error && <Text style={[typography.small, styles.error, { color: theme.danger }]}>{error}</Text>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: 'center', marginBottom: 32 },
  form: { gap: 12 },
  error: { textAlign: 'center' },
});
