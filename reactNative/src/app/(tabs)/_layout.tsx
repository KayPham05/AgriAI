import { Tabs } from 'expo-router';

import { ShellTabBar, type ShellTabBarProps } from '@/components/ui/ShellTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <ShellTabBar {...(props as unknown as ShellTabBarProps)} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Tra cứu' }} />
      <Tabs.Screen name="diagnosis" options={{ title: 'Chẩn đoán' }} />
      <Tabs.Screen name="history" options={{ title: 'Lịch sử' }} />
      <Tabs.Screen name="account" options={{ title: 'Tài khoản' }} />
    </Tabs>
  );
}
