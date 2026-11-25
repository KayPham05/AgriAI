import { router } from 'expo-router';
import { HomeScreen } from '@/features/home/screens/HomeScreen';

export default function HomeRoute() { return <HomeScreen isAuthenticated={false} onDiagnose={() => router.push('/(tabs)/diagnosis')} />; }
