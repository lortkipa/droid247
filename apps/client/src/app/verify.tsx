import { VERIFICATION_CODE_LENGTH } from '@droid247/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CodeInput } from '@/components/CodeInput';
import { Screen } from '@/components/Screen';
import { useAuth, useAuthStage } from '@/lib/auth';
import { fonts, typography, useTheme } from '@/lib/theme';

export default function VerifyScreen() {
  const theme = useTheme();
  const { verifyCode, changeEmail } = useAuth();
  const verifying = useAuthStage('verifying');
  const [code, setCode] = useState('');

  // Rendered for a moment while the router leaves this screen.
  if (!verifying) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <Text style={[typography.title, styles.center, { color: theme.text }]}>Check your Email</Text>
      <Text style={[typography.body, styles.center, styles.subtitle, { color: theme.muted }]}>
        We sent a code to{' '}
        <Text style={[styles.email, { color: theme.text }]}>{verifying.email}</Text>.
      </Text>

      <CodeInput
        length={VERIFICATION_CODE_LENGTH}
        value={code}
        onChange={setCode}
        onComplete={verifyCode}
        error={verifying.failed}
        autoFocus
      />
      {verifying.failed && (
        <Text style={[typography.small, styles.center, styles.error, { color: theme.danger }]}>
          Incorrect code.
        </Text>
      )}

      <View style={styles.actions}>
        <Button title="Continue with a different Email" variant="secondary" onPress={changeEmail} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  subtitle: { marginTop: 8, marginBottom: 32 },
  email: { fontFamily: fonts.medium },
  error: { marginTop: 12 },
  actions: { marginTop: 24 },
});
