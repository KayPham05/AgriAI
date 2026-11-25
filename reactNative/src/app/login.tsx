import { router } from 'expo-router';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';

export default function LoginRoute() {
  return <LoginScreen onSuccess={() => router.replace('/(tabs)/home')} />;
}
