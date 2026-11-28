import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { theme } from '@/theme/tokens';

interface HistoryScreenProps {
  isAuthenticated?: boolean;
  onLogin?: () => void;
}

export function HistoryScreen({ isAuthenticated = false, onLogin }: HistoryScreenProps = {}) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader title="Lịch sử" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {isAuthenticated ? (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Chưa có lịch sử chẩn đoán</Text>
              <Text style={styles.description}>Các lần chẩn đoán đã lưu sẽ hiển thị tại đây.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Image
                  source={require('../../../../assets/shell/lock-keyhole.png')}
                  accessible={false}
                  style={styles.icon}
                />
                <Text accessibilityRole="header" style={styles.cardTitle}>Xem lịch sử của bạn</Text>
              </View>
              <Text style={styles.description}>Đăng nhập để xem và lưu lịch sử của bạn.</Text>
              <ActionButton
                label="Đăng nhập"
                onPress={onLogin}
                accessibilityHint={onLogin ? 'Mở màn hình đăng nhập.' : 'Chức năng đang được chuẩn bị.'}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingTop: theme.spacing.control,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.gutter,
  },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.lg },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.control,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control },
  icon: { width: theme.shell.iconSize, height: theme.shell.iconSize, flexShrink: 0 },
  cardTitle: { ...theme.typography.section, flex: 1, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
});
