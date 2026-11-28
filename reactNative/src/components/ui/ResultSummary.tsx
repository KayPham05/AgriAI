import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme/tokens';

export interface ResultSummaryProps {
  plantName: string;
  conditionName: string;
  confidence: number | null;
  lowConfidenceWarning?: boolean;
  timestamp?: string;
  snapshotLabel?: string;
  informationPending?: boolean;
  disclaimer?: string;
}

const DEFAULT_THRESHOLD = 0.8;
const DEFAULT_DISCLAIMER = 'Kết quả mang tính tham khảo, cần kiểm tra thực tế trước khi xử lý.';

/** Formats confidence to one decimal place (e.g., 0.75 -> 75,0%) without mutating raw threshold checks. */
export function formatConfidencePercent(confidence: number): string {
  const clamped = Math.max(0, Math.min(1, confidence));
  return `${(clamped * 100).toFixed(1).replace('.', ',')}%`;
}

/** Summarizes plant, condition, confidence/warning, and snapshot metadata per design-system rules. */
export function ResultSummary({
  plantName,
  conditionName,
  confidence,
  lowConfidenceWarning,
  timestamp,
  snapshotLabel,
  informationPending = false,
  disclaimer = DEFAULT_DISCLAIMER,
}: ResultSummaryProps) {
  // Compare raw confidence <= 0.80 BEFORE rounding for display.
  const showWarning = lowConfidenceWarning ?? (confidence !== null && confidence <= DEFAULT_THRESHOLD);

  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={styles.plant}>{plantName}</Text>
        {snapshotLabel && (
          <View style={styles.snapshotBadge}>
            <Text style={styles.snapshotText}>{snapshotLabel}</Text>
          </View>
        )}
      </View>
      <Text accessibilityRole="header" style={styles.condition}>{conditionName}</Text>
      {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}

      {confidence !== null ? (
        <View style={styles.confidenceBlock}>
          <Text style={styles.confidenceLabel}>Độ tin cậy mô hình</Text>
          <Text style={styles.confidenceValue}>{formatConfidencePercent(confidence)}</Text>
        </View>
      ) : (
        <Text style={styles.pending}>Thông tin độ tin cậy đang được cập nhật.</Text>
      )}

      {showWarning && (
        <View style={styles.warningBox}>
          <View style={styles.warningBadge}>
            <Text accessible={false} style={styles.warningBadgeText}>!</Text>
          </View>
          <Text accessibilityRole="alert" style={styles.warningText}>
            Độ tin cậy chưa cao (từ 80,0% trở xuống). Cần kiểm tra thực tế và không tự ý dùng thuốc đặc trị.
          </Text>
        </View>
      )}

      {informationPending && (
        <Text style={styles.pending}>Thông tin đang được cập nhật.</Text>
      )}

      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.control,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  plant: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  snapshotBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  snapshotText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  condition: {
    ...theme.typography.section,
    color: theme.colors.text,
  },
  timestamp: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  confidenceBlock: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.input,
    padding: theme.spacing.control,
    gap: theme.spacing.xs,
  },
  confidenceLabel: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
  },
  confidenceValue: {
    ...theme.typography.confidence,
    color: theme.colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.input,
    padding: theme.spacing.control,
  },
  warningBadge: {
    width: theme.shell.iconSize,
    height: theme.shell.iconSize,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warningBadgeText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
  },
  warningText: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
  },
  pending: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  disclaimer: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
