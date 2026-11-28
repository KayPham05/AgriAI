import { fetch } from 'expo/fetch';
import { router } from 'expo-router';

import { useStartupSession } from '@/features/auth/StartupSession';
import { useDiagnosisDraft } from '@/features/diagnosis/diagnosisDraft';
import { saveGuestPrediction } from '@/features/diagnosis/saveGuestPrediction';
import { DiagnosisResultScreen } from '@/features/diagnosis/screens/DiagnosisResultScreen';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function DiagnosisResultRoute() {
  const { session } = useStartupSession();
  const isUser = session.status === 'user';
  const { draft, lastResult, clearDraft } = useDiagnosisDraft();

  return (
    <DiagnosisResultScreen
      result={lastResult}
      localImageUri={draft?.uri}
      isAuthenticated={isUser}
      onNewDiagnosis={() => {
        clearDraft();
        router.replace('/(tabs)/diagnosis');
      }}
      onLoginToSave={() => router.push({ pathname: '/login', params: { returnTo: '/diagnosis/result' } })}
      onSaveGuest={(guestToken) =>
        saveGuestPrediction({
          guestToken,
          readToken: sessionToken.readToken,
          request: fetch,
          apiOrigin: process.env.EXPO_PUBLIC_API_URL,
          allowHttp: __DEV__,
        })
      }
      onOpenHistory={() => router.replace('/(tabs)/history')}
      onBack={() => router.back()}
    />
  );
}
