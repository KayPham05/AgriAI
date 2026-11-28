import { router } from 'expo-router';

import { AccountScreen } from '@/features/account/screens/AccountScreen';

export default function AccountRoute() {
  return (
    <AccountScreen
      onLogin={() => router.push({ pathname: '/login', params: { returnTo: '/(tabs)/account' } })}
    />
  );
}
