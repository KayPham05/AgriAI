import { ActivityIndicator, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

export type MediaPreviewStatus = 'ready' | 'loading' | 'error' | 'expired';

export interface MediaPreviewProps {
  status?: MediaPreviewStatus;
  uri?: string;
  source?: ImageSourcePropType;
  accessibilityLabel?: string;
  onReplace?: () => void;
  replaceLabel?: string;
  onRemove?: () => void;
  removeLabel?: string;
}

/** Single-image 4:3 contain preview with honest loading, failed, and expired placeholders. */
export function MediaPreview({
  status = 'ready',
  uri,
  source,
  accessibilityLabel = 'Ảnh lá cây đã chọn',
  onReplace,
  replaceLabel = 'Chọn ảnh khác',
  onRemove,
  removeLabel = 'Gỡ ảnh',
}: MediaPreviewProps) {
  const imageSource = source ?? (uri ? { uri } : undefined);
  const showImage = status === 'ready' && Boolean(imageSource);

  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        {showImage && imageSource ? (
          <Image
            source={imageSource}
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
            resizeMode="contain"
            style={styles.image}
          />
        ) : status === 'loading' ? (
          <View style={styles.placeholder} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.placeholderText}>Đang chuẩn bị ảnh...</Text>
          </View>
        ) : status === 'expired' ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Ảnh gốc đã hết thời hạn lưu</Text>
            <Text style={styles.placeholderText}>Kết quả và thông tin chẩn đoán vẫn được giữ lại.</Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Không thể hiển thị ảnh</Text>
            <Text style={styles.placeholderText}>Vui lòng chọn lại ảnh lá rõ nét.</Text>
          </View>
        )}
      </View>
      {(onReplace || onRemove) && (
        <View style={styles.actions}>
          {onReplace && (
            <View style={styles.actionItem}>
              <ActionButton label={replaceLabel} variant="secondary" onPress={onReplace} />
            </View>
          )}
          {onRemove && (
            <View style={styles.actionItem}>
              <ActionButton label={removeLabel} variant="ghost" onPress={onRemove} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export const PhotoFrame = MediaPreview;

const styles = StyleSheet.create({
  container: { gap: theme.spacing.control },
  frame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: theme.radius.media,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    padding: theme.spacing.gutter,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  placeholderTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
    textAlign: 'center',
  },
  placeholderText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionItem: {
    flexGrow: 1,
  },
});
