import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

interface HomeScreenProps { isAuthenticated: boolean; onDiagnose: () => void }

export function HomeScreen({ isAuthenticated, onDiagnose }: HomeScreenProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.brand}>AgriVision</Text><Text style={styles.caption}>Sổ tay vườn nhà</Text></View>
          <Text accessibilityLabel="Thông báo" style={styles.notification}>○</Text>
        </View>
        <View style={styles.hero}>
          <Image source={require('../../../../assets/welcome-rice-field.png')} accessibilityLabel="Cánh đồng lúa trong vườn nhà" style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroCopy}>
            <Text accessibilityRole="header" style={styles.greeting}>Chào bạn</Text>
            <Text style={styles.heroDescription}>Chụp một chiếc lá rõ nét để tìm hiểu tình trạng cây.</Text>
            <ActionButton label="Chụp ảnh lá" onPress={onDiagnose} />
          </View>
        </View>
        {isAuthenticated ? (
          <View style={styles.section}><Text style={styles.sectionTitle}>Gần đây</Text><View style={styles.recentRow}>
            <View style={styles.thumbnail}><Text style={styles.thumbnailText}>LÁ</Text></View>
            <View style={styles.recentCopy}><Text style={styles.recentTitle}>Đốm nâu trên lá lúa</Text><Text style={styles.caption}>19/11/2026 · Mẫu đã lưu</Text></View><Text style={styles.chevron}>›</Text>
          </View></View>
        ) : <View style={styles.guestCard}><Text style={styles.sectionTitle}>Lưu kết quả của bạn</Text><Text style={styles.description}>Đăng nhập để xem và lưu các lần chẩn đoán.</Text></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background }, content: { paddingBottom: theme.spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.gutter }, brand: { ...theme.typography.brand, color: theme.colors.text }, caption: { ...theme.typography.label, color: theme.colors.textMuted }, notification: { color: theme.colors.primary, fontSize: 28 },
  hero: { marginHorizontal: theme.spacing.gutter, overflow: 'hidden', borderRadius: theme.radius.media, backgroundColor: theme.colors.primaryPressed }, heroImage: { width: '100%', aspectRatio: 1.8 }, heroCopy: { gap: theme.spacing.sm, padding: theme.spacing.gutter }, greeting: { ...theme.typography.display, color: theme.colors.onPrimary }, heroDescription: { ...theme.typography.body, color: theme.colors.secondary }, description: { ...theme.typography.body, color: theme.colors.textMuted },
  section: { gap: theme.spacing.sm, padding: theme.spacing.gutter }, sectionTitle: { ...theme.typography.title, color: theme.colors.text }, recentRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingVertical: theme.spacing.md }, thumbnail: { width: 64, height: 56, borderRadius: theme.radius.input, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }, thumbnailText: { ...theme.typography.label, color: theme.colors.primary }, recentCopy: { flex: 1, gap: theme.spacing.xs }, recentTitle: { ...theme.typography.bodyStrong, color: theme.colors.text }, chevron: { color: theme.colors.primary, fontSize: 28 }, guestCard: { margin: theme.spacing.gutter, gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.card, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
});
