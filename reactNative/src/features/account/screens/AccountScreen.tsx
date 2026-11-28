import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { ListRow } from '@/components/ui/ListRow';
import { theme } from '@/theme/tokens';

interface AccountScreenProps {
  onLogin?: () => void;
  onRegister?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
}

export function AccountScreen({ onLogin, onRegister, onSettings, onHelp }: AccountScreenProps = {}) {
  const unavailableHint = 'Chức năng đang được chuẩn bị.';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader title="Tài khoản" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image
                source={require('../../../../assets/shell/user-round.png')}
                accessible={false}
                style={styles.icon}
              />
              <Text accessibilityRole="header" style={styles.cardTitle}>Bạn đang dùng với tư cách khách</Text>
            </View>
            <Text style={styles.description}>Đăng nhập để quản lý thông tin và lưu các lần chẩn đoán.</Text>
            <ActionButton
              label="Đăng nhập"
              onPress={onLogin}
              accessibilityHint={onLogin ? 'Mở màn hình đăng nhập.' : unavailableHint}
            />
            <ActionButton
              label="Đăng ký"
              variant="secondary"
              onPress={onRegister}
              accessibilityHint={onRegister ? 'Mở màn hình tạo tài khoản.' : unavailableHint}
            />
          </View>
          <View style={styles.list}>
            <ListRow
              title="Cài đặt"
              subtitle="Quyền camera và ảnh"
              onPress={onSettings}
              accessibilityHint={onSettings ? undefined : unavailableHint}
            />
            <View style={styles.separator} />
            <ListRow
              title="Trợ giúp"
              subtitle="Hướng dẫn sử dụng và chính sách"
              onPress={onHelp}
              accessibilityHint={onHelp ? undefined : unavailableHint}
            />
          </View>
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
  cardTitle: { ...theme.typography.subtitle, flex: 1, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  list: { width: '100%' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
});
