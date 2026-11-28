import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

export type StatePanelKind = 'loading' | 'empty' | 'error';

export interface StatePanelProps {
  kind: StatePanelKind;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  busy?: boolean;
}

/** Unified feedback panel for loading, empty, and error states without fake progress. */
export function StatePanel({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  busy = false,
}: StatePanelProps) {
  const isError = kind === 'error';
  const isLoading = kind === 'loading';

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.card, isError && styles.errorCard]}
    >
      <View style={styles.header}>
        {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
        {isError && (
          <View style={styles.badge}>
            <Text accessible={false} style={styles.badgeText}>!</Text>
          </View>
        )}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      <Text accessibilityRole={isError ? 'alert' : undefined} style={styles.message}>{message}</Text>
      {actionLabel && (
        <ActionButton
          label={actionLabel}
          onPress={onAction}
          busy={busy}
          variant="primary"
        />
      )}
      {secondaryActionLabel && (
        <ActionButton
          label={secondaryActionLabel}
          onPress={onSecondaryAction}
          variant="secondary"
        />
      )}
    </View>
  );
}

export function LoadingState(props: Omit<StatePanelProps, 'kind'>) {
  return <StatePanel kind="loading" {...props} />;
}

export function EmptyState(props: Omit<StatePanelProps, 'kind'>) {
  return <StatePanel kind="empty" {...props} />;
}

export function ErrorState(props: Omit<StatePanelProps, 'kind'>) {
  return <StatePanel kind="error" {...props} />;
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
  errorCard: {
    borderColor: theme.colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.control,
  },
  badge: {
    width: theme.shell.iconSize,
    height: theme.shell.iconSize,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
  },
  title: {
    ...theme.typography.subtitle,
    flex: 1,
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
});
