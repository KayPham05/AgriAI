import { fetch } from 'expo/fetch';
import { useRouter } from 'expo-router';

import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { useStartupSession } from '@/features/auth/StartupSession';
import { resendLoginOtp, submitLogin, submitRegistration, verifyLoginOtp } from '@/features/auth/submitLogin';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function LoginRoute() {
  const router = useRouter();
  const { startAuthenticatedSession } = useStartupSession();

  const auth = {
    request: fetch,
    apiOrigin: process.env.EXPO_PUBLIC_API_URL,
    allowHttp: __DEV__,
    saveToken: sessionToken.saveToken,
  };

  return (
    <LoginScreen
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      onSubmit={(credentials, signal) => submitLogin(credentials, { ...auth, signal })}
      onRegister={(credentials, signal) => submitRegistration(credentials, { ...auth, signal })}
      onAuthenticated={startAuthenticatedSession}
      otp={{
        verify: (challengeId, code, signal) => verifyLoginOtp(challengeId, code, { ...auth, signal }),
        resend: (challengeId, signal) => resendLoginOtp(challengeId, { ...auth, signal }),
      }}
    />
  );
}
