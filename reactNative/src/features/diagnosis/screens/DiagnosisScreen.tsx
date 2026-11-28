import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { StatePanel } from '@/components/ui/StatePanel';
import type { SelectedLeafImage } from '@/features/diagnosis/diagnosisDraft';
import type { ImagePickOutcome, ImageSourceAdapter } from '@/features/diagnosis/imageSource';
import { theme } from '@/theme/tokens';

export interface DiagnosisScreenProps {
  onCapture?: () => void;
  onPickLibrary?: () => void;
  adapter?: ImageSourceAdapter;
  onImageSelected?: (image: SelectedLeafImage) => void;
}

/** S11 image source selection supporting camera/library permissions without touching prior draft on cancel. */
export function DiagnosisScreen({
  onCapture,
  onPickLibrary,
  adapter,
  onImageSelected,
}: DiagnosisScreenProps = {}) {
  const [busySource, setBusySource] = useState<'camera' | 'library' | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string>();
  const [unavailableNotice, setUnavailableNotice] = useState<string>();
  const unavailableHint = 'Chức năng đang được chuẩn bị.';

  async function handlePick(source: 'camera' | 'library') {
    if (busySource) return;
    if (source === 'camera' && onCapture) {
      onCapture();
      return;
    }
    if (source === 'library' && onPickLibrary) {
      onPickLibrary();
      return;
    }
    if (!adapter) return;

    setBusySource(source);
    setPermissionNotice(undefined);
    setUnavailableNotice(undefined);
    try {
      const outcome: ImagePickOutcome = await (
        source === 'camera' ? adapter.pickFromCamera() : adapter.pickFromLibrary()
      );
      if (outcome.kind === 'selected') {
        onImageSelected?.(outcome.image);
      } else if (outcome.kind === 'permission-denied') {
        setPermissionNotice(
          outcome.source === 'camera'
            ? 'Cho phép camera trong Cài đặt để chụp ảnh lá.'
            : 'Cho phép quyền truy cập ảnh trong Cài đặt để chọn ảnh lá.',
        );
      } else if (outcome.kind === 'unavailable') {
        setUnavailableNotice(outcome.message);
      }
    } catch {
      setUnavailableNotice('Không thể mở trình chọn ảnh lúc này. Vui lòng thử lại.');
    } finally {
      setBusySource(null);
    }
  }

  const cameraAction = (onCapture || adapter) ? () => void handlePick('camera') : undefined;
  const libraryAction = (onPickLibrary || adapter) ? () => void handlePick('library') : undefined;

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader title="Chẩn đoán" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.guidance}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Chụp hoặc chọn ảnh lá</Text>
            <Text style={styles.description}>Chọn một lá rõ nét, đủ sáng và nằm trọn trong ảnh.</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image source={require('../../../../assets/shell/camera.png')} accessible={false} style={styles.icon} />
              <Text style={styles.cardTitle}>Một ảnh mỗi lượt</Text>
            </View>
            <ActionButton
              label="Chụp ảnh"
              busy={busySource === 'camera'}
              disabled={busySource === 'library'}
              onPress={cameraAction}
              accessibilityHint={cameraAction ? 'Mở máy ảnh để chụp một lá cây.' : unavailableHint}
            />
            <ActionButton
              label="Chọn thư viện"
              variant="secondary"
              busy={busySource === 'library'}
              disabled={busySource === 'camera'}
              onPress={libraryAction}
              accessibilityHint={libraryAction ? 'Chọn một ảnh lá từ thư viện thiết bị.' : unavailableHint}
            />
          </View>

          {permissionNotice && (
            <StatePanel
              kind="error"
              title="Cần cấp quyền truy cập"
              message={permissionNotice}
              actionLabel="Mở Cài đặt"
              onAction={adapter ? () => void adapter.openSettings() : undefined}
              secondaryActionLabel="Chọn thư viện"
              onSecondaryAction={libraryAction}
            />
          )}

          {unavailableNotice && (
            <StatePanel
              kind="error"
              title="Chưa thể mở ảnh"
              message={unavailableNotice}
            />
          )}

          {!cameraAction && !libraryAction && (
            <Text style={styles.note}>Chụp và phân tích ảnh lá đang được chuẩn bị.</Text>
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
  guidance: { gap: theme.spacing.control },
  sectionTitle: { ...theme.typography.section, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
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
  cardTitle: { ...theme.typography.bodyStrong, flex: 1, color: theme.colors.text },
  note: { ...theme.typography.caption, color: theme.colors.textMuted },
});
