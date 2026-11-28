import { fetch } from 'expo/fetch';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { useStartupSession } from '@/features/auth/StartupSession';
import { useDiagnosisDraft } from '@/features/diagnosis/diagnosisDraft';
import { AnalyzingScreen } from '@/features/diagnosis/screens/AnalyzingScreen';
import { submitPrediction } from '@/features/diagnosis/submitPrediction';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function AnalyzingRoute() {
  const { session } = useStartupSession();
  const isUser = session.status === 'user';
  const { draft, profileId, setLastResult } = useDiagnosisDraft();

  const handleSubmit = useCallback(
    (signal: AbortSignal) => {
      if (!draft) return Promise.resolve({ kind: 'error', reason: 'service' } as const);
      return submitPrediction({
        uri: draft.uri,
        fileName: draft.fileName,
        mimeType: draft.mimeType,
        isAuthenticated: isUser,
        profileId: isUser ? profileId : null,
        readToken: sessionToken.readToken,
        request: fetch,
        apiOrigin: process.env.EXPO_PUBLIC_API_URL,
        allowHttp: __DEV__,
        signal,
      });
    },
    [draft, isUser, profileId],
  );

  return (
    <AnalyzingScreen
      image={draft}
      isAuthenticated={isUser}
      onSubmit={handleSubmit}
      onCompleted={(result) => {
        setLastResult(result);
        router.replace('/(tabs)/history');
      }}
      onCancel={() => router.back()}
      onOpenHistory={() => router.replace('/(tabs)/history')}
    />
  );
}
