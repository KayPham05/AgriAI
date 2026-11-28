import { Modal, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirmation modal with destructive emphasis, busy lock, and inline error feedback. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  destructive = false,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {error && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          )}
          <View style={styles.actions}>
            <ActionButton
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              busy={busy}
              onPress={onConfirm}
            />
            <ActionButton
              label={cancelLabel}
              variant="secondary"
              disabled={busy}
              onPress={onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.gutter,
  },
  dialog: {
    width: '100%',
    maxWidth: theme.layout.contentMaxWidth,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.gutter,
    gap: theme.spacing.md,
  },
  title: { ...theme.typography.section, color: theme.colors.text },
  message: { ...theme.typography.body, color: theme.colors.textMuted },
  error: { ...theme.typography.caption, color: theme.colors.error },
  actions: { gap: theme.spacing.sm },
});
