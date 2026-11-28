import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MediaPreview } from '@/components/ui/MediaPreview';
import { ProfilePickerSheet } from '@/components/ui/ProfilePickerSheet';
import { ResultSummary } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import type { PredictionResult } from '@/features/diagnosis/submitPrediction';
import type { MutationResult } from '@/features/history/predictionDetailApi';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { theme } from '@/theme/tokens';

export interface PredictionDetailScreenProps {
  detail: PredictionResult | null;
  loading?: boolean;
  notFound?: boolean;
  error?: string;
  imageUrl?: string;
  imageStatus?: 'ready' | 'expired' | 'error';
  profiles?: readonly AgriculturalProfileItem[];
  onRetry?: () => void;
  onAssignProfile?: (profileId: string | null) => Promise<MutationResult>;
  onDelete?: () => Promise<MutationResult>;
  onDeleted?: () => void;
  onBack: () => void;
}

/** S16 historical prediction snapshot screen with profile attach/remove and delete confirmation. */
export function PredictionDetailScreen({
  detail,
  loading = false,
  notFound = false,
  error,
  imageUrl,
  imageStatus,
  profiles = [],
  onRetry,
  onAssignProfile,
  onDelete,
  onDeleted,
  onBack,
}: PredictionDetailScreenProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [profileBusy, setProfileBusy] = useState(false);

  const attachedProfile = profiles.find((p) => p.id === detail?.agriculturalProfileId);
  const isExpired =
    imageStatus === 'expired' ||
    Boolean(detail?.images.length && detail.images.every((img) => img.isExpired));

  async function handleConfirmDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    setDeleteError(undefined);
    const res = await onDelete();
    setDeleting(false);
    if (res.kind === 'ok') {
      setDeleteVisible(false);
      onDeleted?.();
    } else {
      setDeleteError('Chưa thể xóa kết quả lúc này. Vui lòng thử lại.');
    }
  }

  async function handleProfileSelect(nextId: string | null) {
    if (!onAssignProfile || profileBusy) return;
    setProfileBusy(true);
    await onAssignProfile(nextId);
    setProfileBusy(false);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Chi tiết lịch sử</Text>
        {detail && onDelete && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa"
            onPress={() => setDeleteVisible(true)}
            style={styles.deleteBtn}
          >
            <Text style={styles.deleteText}>Xóa</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {loading ? (
            <StatePanel kind="loading" title="Đang tải chi tiết" message="Vui lòng đợi trong giây lát." />
          ) : notFound ? (
            <StatePanel
              kind="error"
              title="Không tìm thấy kết quả"
              message="Kết quả không tồn tại hoặc bạn không có quyền xem."
              actionLabel="Quay lại"
              onAction={onBack}
            />
          ) : error || !detail ? (
            <StatePanel
              kind="error"
              title="Không tải được chi tiết"
              message={error ?? 'Vui lòng thử lại.'}
              actionLabel={onRetry ? 'Thử lại' : undefined}
              onAction={onRetry}
            />
          ) : (
            <>
              <MediaPreview
                status={isExpired ? 'expired' : imageStatus ?? (imageUrl ? 'ready' : 'error')}
                uri={imageUrl}
                accessibilityLabel={`Ảnh lịch sử: ${detail.predictedPlantDisease.diseaseVietnameseName ?? detail.predictedPlantDisease.diseaseName}`}
              />

              <ResultSummary
                plantName={detail.predictedPlantDisease.plantVietnameseName?.trim() || detail.predictedPlantDisease.plantName}
                conditionName={detail.predictedPlantDisease.diseaseVietnameseName?.trim() || detail.predictedPlantDisease.diseaseName}
                confidence={detail.confidence}
                lowConfidenceWarning={detail.confidence <= 0.8 || Boolean(detail.warning)}
                timestamp={detail.createdAt}
                snapshotLabel={detail.hasHistoricalSnapshot ? 'Bản lưu lịch sử (snapshot)' : undefined}
                informationPending={detail.informationPending}
              />

              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.cardTitle}>Hồ sơ nông nghiệp gắn kèm</Text>
                <Text style={styles.bodyText}>
                  {attachedProfile ? attachedProfile.name : 'Chưa gắn hồ sơ'}
                </Text>
                {onAssignProfile && (
                  <ActionButton
                    label={attachedProfile ? 'Đổi hoặc gỡ hồ sơ' : 'Gắn hồ sơ'}
                    variant="secondary"
                    busy={profileBusy}
                    onPress={() => setPickerVisible(true)}
                  />
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {detail && onAssignProfile && (
        <ProfilePickerSheet
          visible={pickerVisible}
          profiles={profiles}
          selectedProfileId={detail.agriculturalProfileId ?? null}
          onSelect={(id) => void handleProfileSelect(id)}
          onClose={() => setPickerVisible(false)}
        />
      )}

      <ConfirmDialog
        visible={deleteVisible}
        title="Xóa kết quả chẩn đoán"
        message="Thao tác này sẽ xóa kết quả khỏi lịch sử của bạn và không thể hoàn tác."
        confirmLabel="Xóa kết quả"
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
  deleteBtn: { minWidth: theme.layout.touchMin, minHeight: theme.layout.touchMin, justifyContent: 'center', alignItems: 'flex-end' },
  deleteText: { ...theme.typography.label, color: theme.colors.error },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xl },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  card: {
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.card, padding: theme.spacing.md, gap: theme.spacing.sm,
  },
  cardTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  bodyText: { ...theme.typography.body, color: theme.colors.text },
});
