import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupSessionProvider, useStartupSession } from '@/features/auth/StartupSession';
import { DiagnosisDraftProvider } from '@/features/diagnosis/diagnosisDraft';
import { theme } from '@/theme/tokens';

function SessionStack() {
  const { session } = useStartupSession();
  const signedIn = session.status === 'user';

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: theme.colors.background },
    }}>
      <Stack.Protected guard={!signedIn} redirectTo="/home">
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={session.status === 'guest'} redirectTo={signedIn ? '/home' : '/'}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn} redirectTo="/">
        <Stack.Screen name="home" />
      </Stack.Protected>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="gallery" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StartupSessionProvider>
        <DiagnosisDraftProvider>
          <SessionStack />
        </DiagnosisDraftProvider>
      </StartupSessionProvider>
    </SafeAreaProvider>
  );
}
