import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  // Root view colour, visible behind screens while the keyboard animates.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  if (!ready) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootStack />
    </AuthProvider>
  );
}

/** Each sign-in stage unlocks exactly one screen, so there is nothing to go back to. */
function RootStack() {
  const theme = useTheme();
  const { stage } = useAuth().state;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        title: 'Droid247',
        animation: 'none',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Protected guard={stage === 'signedOut'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'verifying'}>
        <Stack.Screen name="verify" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'naming'}>
        <Stack.Screen name="name" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'signedIn'}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  );
}
