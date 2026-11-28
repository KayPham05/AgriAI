import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { MediaPreview } from '@/components/ui/MediaPreview';
import { ProfilePickerSheet } from '@/components/ui/ProfilePickerSheet';
import { StatePanel } from '@/components/ui/StatePanel';
import type { SelectedLeafImage } from '@/features/diagnosis/diagnosisDraft';
import { validateLeafImage } from '@/features/diagnosis/validateLeafImage';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { theme } from '@/theme/tokens';

export interface ImagePreviewScreenProps {
  image: SelectedLeafImage | null;
  isAuthenticated: boolean;
  profiles?: readonly AgriculturalProfileItem[];
  profilesLoading?: boolean;
  selectedProfileId: string | null;
  onSelectProfileId: (id: string | null) => void;
  onReplaceImage: () => void;
  onBack: () => void;
  onAnalyze: (payload: { image: SelectedLeafImage; profileId: string | null }) => void;
}

/** S12 single-image 4:3 contain preview with JPEG/PNG <= 15 MiB check and optional User profile picker. */
export function ImagePreviewScreen({
  image,
  isAuthenticated,
  profiles = [],
  profilesLoading = false,
  selectedProfileId,
  onSelectProfileId,
  onReplaceImage,
  onBack,
  onAnalyze,
}: ImagePreviewScreenProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const validation = image ? validateLeafImage(image) : null;
  const canAnalyze = Boolean(image && validation?.valid);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.badge}>Một ảnh</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Xem trước ảnh</Text>
          <Text style={styles.subtitle}>Kiểm tra độ sáng và lá nằm trọn trong khung (contain 4:3, không crop).</Text>

          {image ? (
            <>
              <MediaPreview
                status="ready"
                uri={image.uri}
                accessibilityLabel={`Ảnh lá đã chọn: ${image.fileName}`}
                onReplace={onReplaceImage}
                replaceLabel="Đổi ảnh"
              />
              {validation?.valid ? (
                <Text style={styles.meta}>{`${validation.formatLabel} · ${validation.sizeLabel} · Đạt chuẩn kiểm tra`}</Text>
              ) : validation ? (
                <StatePanel
                  kind="error"
                  title="Ảnh chưa hợp lệ"
                  message={validation.message}
                  actionLabel="Đổi ảnh"
                  onAction={onReplaceImage}
                />
              ) : null}

              {isAuthenticated && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Hồ sơ nông nghiệp"
                  onPress={() => setPickerVisible(true)}
                  style={styles.profileRow}
                >
                  <Text style={styles.profileLabel}>Hồ sơ nông nghiệp (tùy chọn)</Text>
                  <Text style={styles.profileValue}>
                    {selectedProfile ? selectedProfile.name : 'Không gắn hồ sơ'}
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <StatePanel
              kind="empty"
              title="Chưa có ảnh được chọn"
              message="Vui lòng chụp hoặc chọn một ảnh lá để tiếp tục."
              actionLabel="Chọn ảnh"
              onAction={onReplaceImage}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <ActionButton
          label="Phân tích ảnh"
          disabled={!canAnalyze}
          onPress={canAnalyze && image ? () => onAnalyze({ image, profileId: isAuthenticated ? selectedProfileId : null }) : undefined}
        />
      </View>

      {isAuthenticated && (
        <ProfilePickerSheet
          visible={pickerVisible}
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          loading={profilesLoading}
          onSelect={onSelectProfileId}
          onClose={() => setPickerVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing.sm,
  },
  backBtn: { minHeight: theme.layout.touchMin, justifyContent: 'center', paddingRight: theme.spacing.control },
  backText: { ...theme.typography.label, color: theme.colors.text },
  badge: { ...theme.typography.label, color: theme.colors.primary },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.lg },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  title: { ...theme.typography.headerTitle, color: theme.colors.text },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted },
  meta: { ...theme.typography.caption, color: theme.colors.textMuted },
  profileRow: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    minHeight: theme.layout.touchMin,
  },
  profileLabel: { ...theme.typography.label, color: theme.colors.textMuted },
  profileValue: { ...theme.typography.bodyStrong, color: theme.colors.text },
  footer: {
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
