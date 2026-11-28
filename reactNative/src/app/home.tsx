import { useStartupSession } from '@/features/auth/StartupSession';
import { UserHomeScreen } from '@/features/home/screens/UserHomeScreen';

export default function HomeRoute() {
  const { session } = useStartupSession();
  return session.status === 'user'
    ? <UserHomeScreen key={session.userId} fullName={session.fullName} />
    : null;
}
