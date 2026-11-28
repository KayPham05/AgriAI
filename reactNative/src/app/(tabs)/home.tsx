import { router } from 'expo-router';

import { useStartupSession } from '@/features/auth/StartupSession';
import { HomeScreen } from '@/features/home/screens/HomeScreen';

export default function HomeTabRoute() {
  const { session } = useStartupSession();
  return (
    <HomeScreen
      isAuthenticated={session.status === 'user'}
      onDiagnose={() => router.push('/(tabs)/diagnosis')}
    />
  );
}
