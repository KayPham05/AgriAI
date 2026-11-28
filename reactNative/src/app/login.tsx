import { fetch } from 'expo/fetch';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resolveReturnTarget } from '@/features/auth/returnTarget';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { useStartupSession } from '@/features/auth/StartupSession';
import { requestPasswordReset, resetPassword, verifyPasswordResetCode, resendLoginOtp, submitLogin, submitRegistration, verifyLoginOtp } from '@/features/auth/submitLogin';
import { sessionToken } from '@/lib/storage/sessionToken';

export default function LoginRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const { startAuthenticatedSession } = useStartupSession();

  function handleAuthenticated(user: { userId: string; fullName: string }) {
    startAuthenticatedSession(user);
    if (params.returnTo !== undefined) {
      router.replace(resolveReturnTarget(params.returnTo));
    }
  }

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
      onAuthenticated={handleAuthenticated}
      onRequestPasswordReset={(email, signal) => requestPasswordReset(email, {
        request: fetch, apiOrigin: auth.apiOrigin, allowHttp: auth.allowHttp, signal,
      })}
      recoveryActions={{
        verify:(code,signal)=>verifyPasswordResetCode(code,{request:fetch,apiOrigin:auth.apiOrigin,allowHttp:auth.allowHttp,signal}),
        reset:(values,signal)=>resetPassword(values,{request:fetch,apiOrigin:auth.apiOrigin,allowHttp:auth.allowHttp,signal}),
      }}
      otp={{
        verify: (challengeId, code, signal) => verifyLoginOtp(challengeId, code, { ...auth, signal }),
        resend: (challengeId, signal) => resendLoginOtp(challengeId, { ...auth, signal }),
      }}
    />
  );
}
