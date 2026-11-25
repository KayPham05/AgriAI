import { Tabs } from 'expo-router';
import { theme } from '@/theme/tokens';

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textMuted, tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, minHeight: 64 }, tabBarLabelStyle: { fontSize: 12 } }}>
    <Tabs.Screen name="home" options={{ title: 'Trang chủ' }} />
    <Tabs.Screen name="catalog" options={{ title: 'Tra cứu' }} />
    <Tabs.Screen name="diagnosis" options={{ title: 'Chẩn đoán' }} />
    <Tabs.Screen name="history" options={{ title: 'Lịch sử' }} />
    <Tabs.Screen name="account" options={{ title: 'Tài khoản' }} />
  </Tabs>;
}
