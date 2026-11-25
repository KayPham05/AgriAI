import { WelcomeScreen } from '@/features/onboarding/screens/WelcomeScreen';
import { router } from 'expo-router';

export default function WelcomeRoute() {
  return <WelcomeScreen onNavigate={(intent) => {
    if (intent === 'login') router.push('/login');
    if (intent === 'guest-diagnosis') router.push('/(tabs)/diagnosis');
    if (intent === 'catalog') router.push('/(tabs)/catalog');
  }} />;
}
