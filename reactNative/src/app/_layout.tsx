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
      <Stack.Screen name="diagnosis/preview" />
      <Stack.Screen name="diagnosis/analyzing" />
      <Stack.Screen name="diagnosis/result" />
      <Stack.Screen name="prediction/[id]" />
      <Stack.Screen name="profiles/index" />
      <Stack.Screen name="profiles/editor" />
      <Stack.Screen name="profiles/[id]" />
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
