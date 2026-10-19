import { EmailSchema } from '@droid247/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { GoogleIcon } from '@/components/GoogleIcon';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/lib/auth';
import { typography, useTheme } from '@/lib/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { requestEmailCode, continueWithGoogle, busy, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmed = email.trim();

  const submit = () => {
    if (!trimmed || busy) return;
    if (!EmailSchema.safeParse(trimmed).success) {
      setError('Enter a valid email address.');
      return;
    }
    void requestEmailCode(trimmed);
  };

  return (
    <Screen>
      <Text style={[typography.title, styles.title, { color: theme.text }]}>Log in to Droid247</Text>

      <View style={styles.form}>
        <TextField
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          onSubmitEditing={submit}
          error={error}
          placeholder="Email Address"
          accessibilityLabel="Email Address"
          keyboardType="email-address"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          // Keep focus on Enter so an invalid address can be fixed right away
          // (submitBehavior on native, blurOnSubmit on web).
          submitBehavior="submit"
          blurOnSubmit={false}
        />
        <Button title="Continue with Email" onPress={submit} loading={busy} disabled={!trimmed} />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <Button
        title="Continue with Google"
        variant="secondary"
        icon={<GoogleIcon />}
        onPress={() => void continueWithGoogle()}
      />
      {authError && (
        <Text style={[typography.small, styles.error, { color: theme.danger }]}>{authError}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: 'center', marginBottom: 32 },
  form: { gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 24 },
  error: { textAlign: 'center', marginTop: 12 },
});
