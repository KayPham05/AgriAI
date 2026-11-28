import { Fragment } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { ListRow } from '@/components/ui/ListRow';
import { formatConfidencePercent } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import type { RecentPredictionItem } from '@/features/home/fetchRecentPredictions';
import { theme } from '@/theme/tokens';

export type HomeHistoryState =
  | { status: 'loading' }
  | { status: 'loaded'; items: readonly RecentPredictionItem[] }
  | { status: 'error' };

export interface HomeScreenProps {
  isAuthenticated: boolean;
  fullName?: string;
  history?: HomeHistoryState;
  onDiagnose: () => void;
  onLogin?: () => void;
  onCatalog?: () => void;
  onHistory?: () => void;
  onProfiles?: () => void;
  onNotifications?: () => void;
  onSelectPrediction?: (id: string) => void;
  onRetryHistory?: () => void;
}

function formatDateLabel(raw: string): string {
  if (!raw) return 'Đã lưu';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
}

/** S10 Home screen supporting Guest and User variants without faking unavailable API metrics. */
export function HomeScreen({
  isAuthenticated,
  fullName,
  history = { status: 'loaded', items: [] },
  onDiagnose,
  onLogin,
  onCatalog,
  onHistory,
  onProfiles,
  onNotifications,
  onSelectPrediction,
  onRetryHistory,
}: HomeScreenProps) {
  const greeting = isAuthenticated && fullName?.trim() ? `Chào ${fullName.trim()}` : 'Chào bạn';
  const unavailableHint = 'Chức năng đang được chuẩn bị.';
  const recentItems = history.status === 'loaded' ? history.items.slice(0, 3) : [];

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandBar}>
          <View>
            <Text style={styles.brand}>AgriVision</Text>
            <Text style={styles.caption}>Sổ tay vườn nhà</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thông báo"
            accessibilityState={{ disabled: !onNotifications }}
            accessibilityHint={onNotifications ? 'Mở danh sách thông báo.' : unavailableHint}
            disabled={!onNotifications}
            onPress={onNotifications}
            style={({ pressed }) => [styles.bellButton, pressed && onNotifications && styles.bellPressed]}
          >
            <Text accessible={false} style={styles.bellGlyph}>{'🔔'}</Text>
          </Pressable>
        </View>

        <Image
          source={require('../../../../assets/welcome-rice-field.png')}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Cánh đồng lúa trong vườn nhà"
          style={styles.heroImage}
          resizeMode="cover"
        />

        <View style={styles.hero}>
          <Text accessibilityRole="header" style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heroDescription}>Chụp một lá rõ nét để kiểm tra tình trạng cây.</Text>
          <ActionButton label="Chụp ảnh lá" variant="secondary" onPress={onDiagnose} />
        </View>

        <View style={styles.body}>
          {isAuthenticated ? (
            <>
              <View style={styles.sectionHeader}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>Gần đây</Text>
                {onHistory && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xem tất cả"
                    onPress={onHistory}
                    style={styles.seeAllButton}
                  >
                    <Text style={styles.seeAllText}>Xem tất cả</Text>
                  </Pressable>
                )}
              </View>

              {history.status === 'loading' ? (
                <StatePanel
                  kind="loading"
                  title="Đang tải kết quả gần đây"
                  message="Vui lòng đợi trong giây lát."
                />
              ) : history.status === 'error' ? (
                <StatePanel
                  kind="error"
                  title="Không tải được kết quả gần đây"
                  message="Vui lòng thử lại. Bạn vẫn có thể chụp ảnh lá ngay lúc này."
                  actionLabel="Thử lại"
                  onAction={onRetryHistory}
                />
              ) : recentItems.length === 0 ? (
                <StatePanel
                  kind="empty"
                  title="Chưa có kết quả gần đây"
                  message="Các lần chẩn đoán đã lưu sẽ hiển thị tại đây."
                />
              ) : (
                <View style={styles.list}>
                  {recentItems.map((item, index) => {
                    const title = item.plantName ? `${item.diseaseName} · ${item.plantName}` : item.diseaseName;
                    const subtitle = `${formatDateLabel(item.createdAt)} · ${formatConfidencePercent(item.confidence)}`;
                    return (
                      <Fragment key={item.id}>
                        {index > 0 && <View style={styles.separator} />}
                        <ListRow
                          title={title}
                          subtitle={subtitle}
                          icon={require('../../../../assets/shell/sprout.png')}
                          onPress={onSelectPrediction ? () => onSelectPrediction(item.id) : undefined}
                          accessibilityHint={onSelectPrediction ? 'Mở chi tiết kết quả chẩn đoán.' : unavailableHint}
                        />
                      </Fragment>
                    );
                  })}
                </View>
              )}

              <View style={styles.separator} />
              <ListRow
                title="Hồ sơ nông nghiệp"
                subtitle="Quản lý vườn cây và mùa vụ"
                icon={require('../../../../assets/shell/user-round.png')}
                onPress={onProfiles}
                accessibilityHint={onProfiles ? 'Mở danh sách hồ sơ nông nghiệp.' : unavailableHint}
              />
            </>
          ) : (
            <View style={styles.guestCard}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Lưu kết quả của bạn</Text>
              <Text style={styles.description}>Đăng nhập để xem và lưu các lần chẩn đoán.</Text>
              <ActionButton
                label="Đăng nhập"
                onPress={onLogin}
                accessibilityHint={onLogin ? 'Mở màn hình đăng nhập.' : unavailableHint}
              />
            </View>
          )}

          <ListRow
            title="Tra cứu cây trồng"
            subtitle="Cây trồng, bệnh hại, thuốc và tài liệu"
            icon={require('../../../../assets/shell/file-text.png')}
            onPress={onCatalog}
            accessibilityHint={onCatalog ? 'Mở danh mục tra cứu công khai.' : unavailableHint}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: theme.spacing.xl },
  brandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing.sm,
  },
  brand: { ...theme.typography.brand, color: theme.colors.text },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
  bellButton: {
    width: theme.layout.touchMin,
    height: theme.layout.touchMin,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellPressed: { backgroundColor: theme.colors.surfaceMuted },
  bellGlyph: { fontSize: theme.typography.subtitle.fontSize, color: theme.colors.primary },
  heroImage: { width: '100%', aspectRatio: 2.2 },
  hero: {
    backgroundColor: theme.colors.primaryPressed,
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  greeting: { ...theme.typography.title, color: theme.colors.onPrimary },
  heroDescription: { ...theme.typography.body, color: theme.colors.secondary },
  body: {
    width: '100%',
    maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.control,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { ...theme.typography.section, color: theme.colors.text },
  seeAllButton: {
    minHeight: theme.layout.touchMin,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  seeAllText: { ...theme.typography.label, color: theme.colors.primary },
  list: { width: '100%' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  guestCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.control,
  },
  cardTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
});
