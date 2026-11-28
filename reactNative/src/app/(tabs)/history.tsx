import { router } from 'expo-router';

import { useStartupSession } from '@/features/auth/StartupSession';
import { HistoryScreen } from '@/features/history/screens/HistoryScreen';

export default function HistoryRoute() {
  const { session } = useStartupSession();
  return (
    <HistoryScreen
      isAuthenticated={session.status === 'user'}
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/history' } })}
    />
  );
}
