import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/theme/tokens';

interface ActionButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  accessibilityHint?: string;
  busy?: boolean;
}

export function ActionButton({
  label, onPress, variant = 'primary', accessibilityHint, busy = false,
}: ActionButtonProps) {
  const disabled = busy || !onPress;
  const muted = disabled && !busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.secondaryPressed),
        muted && styles.disabled,
      ]}
    >
      <Text style={[
        styles.label,
        variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
        muted && styles.disabledLabel,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.layout.touchMin,
    paddingVertical: theme.spacing.control,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  primaryPressed: { backgroundColor: theme.colors.primaryPressed },
  secondaryPressed: { backgroundColor: theme.colors.surfaceMuted },
  disabled: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
  label: { ...theme.typography.bodyStrong, textAlign: 'center' },
  primaryLabel: { color: theme.colors.onPrimary },
  secondaryLabel: { color: theme.colors.onSecondary },
  disabledLabel: { color: theme.colors.textMuted },
});
