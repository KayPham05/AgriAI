import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme/tokens';

export function UserHomeScreen({ fullName }: { fullName: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Trang chủ</Text>
          <View style={styles.greeting}>
            <Text style={styles.display}>Chào {fullName}</Text>
            <Text style={styles.message}>Bạn đã đăng nhập vào AgriAI.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { flexGrow: 1, padding: theme.spacing.gutter },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.lg },
  title: { ...theme.typography.title, color: theme.colors.text },
  greeting: { gap: theme.spacing.control },
  display: { ...theme.typography.title, color: theme.colors.text },
  message: { ...theme.typography.body, color: theme.colors.textMuted },
});
