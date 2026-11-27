import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupSessionProvider, useStartupSession } from '@/features/auth/StartupSession';
import { theme } from '@/theme/tokens';

function SessionStack() {
  const { session } = useStartupSession();
  const signedIn = session.status === 'user';

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: theme.colors.background },
    }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="home" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StartupSessionProvider>
        <SessionStack />
      </StartupSessionProvider>
    </SafeAreaProvider>
  );
}
