import { fetch } from 'expo/fetch';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useStartupSession } from '@/features/auth/StartupSession';
import { fetchRecentPredictions } from '@/features/home/fetchRecentPredictions';
import { HomeScreen, type HomeHistoryState } from '@/features/home/screens/HomeScreen';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function HomeTabRoute() {
  const { session } = useStartupSession();
  const isUser = session.status === 'user';
  const [history, setHistory] = useState<HomeHistoryState>({ status: 'loading' });
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isUser) return;
    const controller = new AbortController();
    void fetchRecentPredictions({
      readToken: sessionToken.readToken,
      request: fetch,
      apiOrigin: process.env.EXPO_PUBLIC_API_URL,
      allowHttp: __DEV__,
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted || result.kind === 'cancelled') return;
      if (result.kind === 'loaded') setHistory({ status: 'loaded', items: result.items });
      else setHistory({ status: 'error' });
    });
    return () => controller.abort();
  }, [isUser, retryTick]);

  function handleRetry() {
    setHistory({ status: 'loading' });
    setRetryTick((prev) => prev + 1);
  }

  return (
    <HomeScreen
      isAuthenticated={isUser}
      fullName={session.status === 'user' ? session.fullName : undefined}
      history={history}
      onDiagnose={() => router.push('/(tabs)/diagnosis')}
      onCatalog={() => router.push('/(tabs)/catalog')}
      onHistory={() => router.push('/(tabs)/history')}
      onProfiles={() => router.push('/profiles')}
      onSelectPrediction={(id) => router.push({ pathname: '/prediction/[id]', params: { id } })}
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/home' } })}
      onRetryHistory={handleRetry}
    />
  );
}
