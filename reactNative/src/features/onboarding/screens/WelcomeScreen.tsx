import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme/tokens';

export function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.brand}>AgriVision</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Quan sát chiếc lá.{"\n"}Hiểu thêm về cây.
          </Text>
          <Text style={styles.description}>Trợ lý chăm sóc cây trồng dành cho bạn.</Text>
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Hẹn gặp bạn sớm</Text>
            <Text style={styles.description}>
              Ứng dụng đang được chuẩn bị. Chức năng chẩn đoán từ ảnh và tra cứu
              sẽ có trong những phiên bản tiếp theo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center', padding: theme.spacing.gutter,
  },
  content: {
    width: '100%', maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center', gap: theme.spacing.lg,
  },
  brand: { ...theme.typography.label, color: theme.colors.primary },
  title: { ...theme.typography.title, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  notice: {
    gap: theme.spacing.sm, padding: theme.spacing.lg,
    borderRadius: theme.radius.card, backgroundColor: theme.colors.surfaceMuted,
  },
  noticeTitle: { ...theme.typography.label, color: theme.colors.text },
});
