import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListRow } from '@/components/ui/ListRow';
import { formatConfidencePercent } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import type { HistoryListItem } from '@/features/history/fetchHistoryList';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import type { DeleteProfileResult } from '@/features/profiles/profileMutations';
import { theme } from '@/theme/tokens';

export interface AgriculturalProfileDetailScreenProps {
  profile: AgriculturalProfileItem | null;
  historyItems: readonly HistoryListItem[];
  loading?: boolean;
  notFound?: boolean;
  error?: string;
  hasMoreHistory?: boolean;
  loadingMoreHistory?: boolean;
  onLoadMoreHistory?: () => void;
  onRetry?: () => void;
  onEdit?: () => void;
  onSelectPrediction?: (id: string) => void;
  onDelete?: () => Promise<DeleteProfileResult>;
  onDeleted?: () => void;
  onBack: () => void;
}

function formatDate(raw: string): string {
  if (!raw) return 'Đã lưu';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** S19 profile detail screen with profile-scoped history and history-preserving delete confirmation. */
export function AgriculturalProfileDetailScreen({
  profile,
  historyItems,
  loading = false,
  notFound = false,
  error,
  hasMoreHistory = false,
  loadingMoreHistory = false,
  onLoadMoreHistory,
  onRetry,
  onEdit,
  onSelectPrediction,
  onDelete,
  onDeleted,
  onBack,
}: AgriculturalProfileDetailScreenProps) {
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  async function handleConfirmDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    setDeleteError(undefined);
    const res = await onDelete();
    setDeleting(false);
    if (res.kind === 'deleted') {
      setDeleteVisible(false);
      onDeleted?.();
    } else {
      setDeleteError('Chưa thể xóa hồ sơ lúc này. Vui lòng thử lại.');
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Chi tiết hồ sơ</Text>
        {profile && onEdit && (
          <Pressable accessibilityRole="button" accessibilityLabel="Sửa" onPress={onEdit} style={styles.editBtn}>
            <Text style={styles.editText}>Sửa</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {loading ? (
            <StatePanel kind="loading" title="Đang tải hồ sơ" message="Vui lòng đợi trong giây lát." />
          ) : notFound ? (
            <StatePanel
              kind="error"
              title="Không tìm thấy hồ sơ"
              message="Hồ sơ không tồn tại hoặc bạn không có quyền xem."
              actionLabel="Về danh sách hồ sơ"
              onAction={onBack}
            />
          ) : error || !profile ? (
            <StatePanel
              kind="error"
              title="Không tải được hồ sơ"
              message={error ?? 'Vui lòng thử lại.'}
              actionLabel={onRetry ? 'Thử lại' : undefined}
              onAction={onRetry}
            />
          ) : (
            <>
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.profileName}>{profile.name}</Text>
                {profile.description && <Text style={styles.description}>{profile.description}</Text>}
                <Text style={styles.count}>{`${profile.predictionCount} lượt chẩn đoán đã gắn`}</Text>
              </View>

              <Text accessibilityRole="header" style={styles.sectionTitle}>Lịch sử của hồ sơ</Text>
              {historyItems.length === 0 ? (
                <StatePanel
                  kind="empty"
                  title="Chưa có lượt chẩn đoán nào"
                  message="Các lượt chẩn đoán gắn với hồ sơ này sẽ hiển thị tại đây."
                />
              ) : (
                <View style={styles.list}>
                  {historyItems.map((item, idx) => {
                    const title = item.plantName ? `${item.diseaseName} · ${item.plantName}` : item.diseaseName;
                    const sub = `${formatDate(item.createdAt)} · ${formatConfidencePercent(item.confidence)}`;
                    return (
                      <Fragment key={item.id}>
                        {idx > 0 && <View style={styles.separator} />}
                        <ListRow
                          title={title}
                          subtitle={sub}
                          icon={require('../../../../assets/shell/sprout.png')}
                          onPress={onSelectPrediction ? () => onSelectPrediction(item.id) : undefined}
                        />
                      </Fragment>
                    );
                  })}
                </View>
              )}

              {hasMoreHistory && onLoadMoreHistory && (
                <ActionButton
                  label="Tải thêm"
                  variant="secondary"
                  busy={loadingMoreHistory}
                  onPress={onLoadMoreHistory}
                />
              )}

              {onDelete && (
                <ActionButton
                  label="Xóa hồ sơ"
                  variant="destructive"
                  onPress={() => setDeleteVisible(true)}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={deleteVisible}
        title="Xóa hồ sơ nông nghiệp"
        message="Chỉ xóa hồ sơ và gỡ liên kết, giữ nguyên lịch sử chẩn đoán của bạn."
        confirmLabel="Xác nhận xóa hồ sơ"
        destructive
        busy={deleting}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          setDeleteError(undefined);
          setDeleteVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.gutter, paddingVertical: theme.spacing.sm,
  },
  backBtn: { minHeight: theme.layout.touchMin, justifyContent: 'center' },
  backText: { ...theme.typography.label, color: theme.colors.text },
  headerTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  editBtn: { minWidth: theme.layout.touchMin, minHeight: theme.layout.touchMin, justifyContent: 'center', alignItems: 'flex-end' },
  editText: { ...theme.typography.label, color: theme.colors.primary },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xl },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.card, padding: theme.spacing.md, gap: theme.spacing.sm,
  },
  profileName: { ...theme.typography.section, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  count: { ...theme.typography.label, color: theme.colors.primary },
  sectionTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  list: { width: '100%' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
});
