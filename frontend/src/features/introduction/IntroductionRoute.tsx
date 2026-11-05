'use client';
import { IntroPage } from '@/views/IntroPage';
import { useAuth } from '@/providers/AppContexts';
import { useActivePlants } from '@/hooks/useActivePlants';
export function IntroductionRoute() {
  const { openAuthentication } = useAuth();
  const { plants } = useActivePlants();
  return (
    <IntroPage
      plants={plants}
      onLogin={() => openAuthentication('login')}
      onRegister={() => openAuthentication('register')}
    />
  );
}
