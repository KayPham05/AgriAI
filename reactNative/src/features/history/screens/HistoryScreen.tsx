import { Fragment, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { FilterSheet, type FilterOption } from '@/components/ui/FilterSheet';
import { ListRow } from '@/components/ui/ListRow';
import { formatConfidencePercent } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import type { HistoryListItem } from '@/features/history/fetchHistoryList';
import { theme } from '@/theme/tokens';

export interface HistoryScreenProps {
  isAuthenticated?: boolean;
  items?: readonly HistoryListItem[];
  loading?: boolean;
  loadingMore?: boolean;
  error?: string;
  hasMore?: boolean;
  filterOptions?: readonly FilterOption[];
  selectedFilterValues?: readonly string[];
  onApplyFilter?: (values: string[]) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onSelectPrediction?: (id: string) => void;
  onDiagnose?: () => void;
  onLogin?: () => void;
}

function formatDate(raw: string): string {
  if (!raw) return 'Đã lưu';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** S15 History list supporting Guest login prompt, server filters, pagination, and expired image placeholders. */
export function HistoryScreen({
  isAuthenticated = false,
  items = [],
  loading = false,
  loadingMore = false,
  error,
  hasMore = false,
  filterOptions = [],
  selectedFilterValues = [],
  onApplyFilter,
  onLoadMore,
  onRefresh,
  onSelectPrediction,
  onDiagnose,
  onLogin,
}: HistoryScreenProps = {}) {
  const [filterVisible, setFilterVisible] = useState(false);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.headerFlex}>
          <AppHeader title="Lịch sử" />
        </View>
        {isAuthenticated && onApplyFilter && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bộ lọc"
            onPress={() => setFilterVisible(true)}
            style={styles.filterBtn}
          >
            <Text style={styles.filterText}>
              {selectedFilterValues.length > 0 ? `Bộ lọc (${selectedFilterValues.length})` : 'Bộ lọc'}
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {!isAuthenticated ? (
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
          ) : loading && items.length === 0 ? (
            <StatePanel kind="loading" title="Đang tải lịch sử" message="Vui lòng đợi trong giây lát." />
          ) : error && items.length === 0 ? (
            <StatePanel
              kind="error"
              title="Không tải được lịch sử"
              message={error}
              actionLabel={onRefresh ? 'Thử lại' : undefined}
              onAction={onRefresh}
            />
          ) : items.length === 0 ? (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Chưa có lịch sử chẩn đoán</Text>
              <Text style={styles.description}>Các lần chẩn đoán đã lưu sẽ hiển thị tại đây.</Text>
              {onDiagnose && (
                <ActionButton label="Chẩn đoán lá cây" onPress={onDiagnose} />
              )}
            </View>
          ) : (
            <>
              {error && (
                <StatePanel
                  kind="error"
                  title="Chưa thể tải thêm"
                  message={error}
                  actionLabel={onRefresh ? 'Thử lại' : undefined}
                  onAction={onRefresh}
                />
              )}
              <View style={styles.list}>
                {items.map((item, idx) => {
                  const title = item.plantName ? `${item.diseaseName} · ${item.plantName}` : item.diseaseName;
                  const baseSub = `${formatDate(item.createdAt)} · ${formatConfidencePercent(item.confidence)}`;
                  const subtitle = item.isImageExpired ? `${baseSub} · Ảnh gốc đã hết hạn` : baseSub;
                  return (
                    <Fragment key={item.id}>
                      {idx > 0 && <View style={styles.separator} />}
                      <ListRow
                        title={title}
                        subtitle={subtitle}
                        icon={
                          item.isImageExpired
                            ? require('../../../../assets/shell/lock-keyhole.png')
                            : require('../../../../assets/shell/sprout.png')
                        }
                        onPress={onSelectPrediction ? () => onSelectPrediction(item.id) : undefined}
                      />
                    </Fragment>
                  );
                })}
              </View>
              {hasMore && onLoadMore && (
                <ActionButton
                  label="Tải thêm"
                  variant="secondary"
                  busy={loadingMore}
                  onPress={onLoadMore}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {isAuthenticated && onApplyFilter && (
        <FilterSheet
          visible={filterVisible}
          title="Lọc lịch sử theo hồ sơ"
          options={filterOptions}
          selectedValues={selectedFilterValues}
          onApply={(values) => {
            setFilterVisible(false);
            onApplyFilter(values);
          }}
          onReset={() => {
            setFilterVisible(false);
            onApplyFilter([]);
          }}
          onCancel={() => setFilterVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingRight: theme.spacing.gutter },
  headerFlex: { flex: 1 },
  filterBtn: {
    minHeight: theme.layout.touchMin,
    paddingHorizontal: theme.spacing.control,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterText: { ...theme.typography.label, color: theme.colors.primary },
  scrollContent: {
    flexGrow: 1,
    paddingTop: theme.spacing.control,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.gutter,
  },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
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
  list: { width: '100%' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
});
