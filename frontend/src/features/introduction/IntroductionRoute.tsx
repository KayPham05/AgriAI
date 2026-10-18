'use client';
import { IntroPage } from '@/views/IntroPage';
import { useAuth } from '@/providers/AppContexts';
export function IntroductionRoute() {
  const { openAuthentication } = useAuth();
  return (
    <IntroPage
      onLogin={() => openAuthentication('login')}
      onRegister={() => openAuthentication('register')}
    />
  );
}
