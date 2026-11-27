import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStartupSession } from '@/features/auth/StartupSession';
import { StartupStatus } from '@/features/auth/screens/StartupStatus';
import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';
import { theme } from '@/theme/tokens';

export function StartupScreen() {
  const { session, canRetry, retry } = useStartupSession();
  const router = useRouter();

  if (session.status === 'guest') {
    return <WelcomeScreen availableIntents={['login']} onNavigate={() => router.push('/login')} />;
  }
  if (session.status === 'user') return null;
  const kind = session.status === 'retry' ? session.reason : session.status;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <StartupStatus kind={kind} onRetry={canRetry ? retry : undefined} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.gutter },
});
