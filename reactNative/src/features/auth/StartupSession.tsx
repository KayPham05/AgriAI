import { fetch } from 'expo/fetch';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { restoreSession, type RestoredSession } from '@/features/auth/restoreSession';
import { sessionToken } from '@/lib/storage/sessionToken';

type StartupSession = {
  session: RestoredSession | { status: 'loading' };
  canRetry: boolean;
  retry: () => void;
};

const StartupSessionContext = createContext<StartupSession | null>(null);

export function StartupSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StartupSession['session']>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void restoreSession({
      ...sessionToken,
      apiOrigin: process.env.EXPO_PUBLIC_API_URL,
      allowHttp: __DEV__,
      request: fetch,
    }).then((result) => {
      if (active) setSession(result);
    });
    return () => { active = false; };
  }, [attempt]);

  function retry() {
    if (session.status !== 'retry') return;
    setSession({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }

  const canRetry = session.status === 'retry' || (session.status === 'loading' && attempt > 0);
  return (
    <StartupSessionContext.Provider value={{ session, canRetry, retry }}>
      {children}
    </StartupSessionContext.Provider>
  );
}

export function useStartupSession() {
  const value = useContext(StartupSessionContext);
  if (!value) throw new Error('Startup session provider is missing');
  return value;
}
