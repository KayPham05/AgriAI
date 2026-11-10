'use client';
import { IntroPage } from '@/views/IntroPage';
import { useAuth } from '@/providers/AppContexts';
import { useActivePlants } from '@/hooks/useActivePlants';
import { useRouter } from 'next/navigation';
export function IntroductionRoute() {
  const { openAuthentication } = useAuth();
  const { plants } = useActivePlants();
  const router = useRouter();
  return (
    <IntroPage
      plants={plants}
      onLogin={() => openAuthentication('login')}
      onRegister={() => openAuthentication('register')}
      onSaveGuestResult={() => {
        router.push('/diagnose');
        openAuthentication('login');
      }}
    />
  );
}
