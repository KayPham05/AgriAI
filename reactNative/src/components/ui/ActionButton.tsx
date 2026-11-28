import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ActionButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  accessibilityHint?: string;
  busy?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  accessibilityHint,
  busy = false,
  loading = false,
  disabled: disabledProp = false,
}: ActionButtonProps) {
  const isLoading = busy || loading;
  const disabled = disabledProp || isLoading || !onPress;
  const muted = disabled && !isLoading;
  const indicatorColor =
    variant === 'primary' || variant === 'destructive'
      ? theme.colors.onPrimary
      : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: isLoading }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !disabled && styles[`${variant}Pressed`],
        muted && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {isLoading && <ActivityIndicator size="small" color={indicatorColor} />}
        <Text
          style={[
            styles.label,
            styles[`${variant}Label`],
            muted && styles.disabledLabel,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export const Button = ActionButton;

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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  primary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  ghost: { backgroundColor: 'transparent', borderColor: theme.colors.border },
  destructive: { backgroundColor: theme.colors.error, borderColor: theme.colors.error },
  primaryPressed: { backgroundColor: theme.colors.primaryPressed },
  secondaryPressed: { backgroundColor: theme.colors.surfaceMuted },
  ghostPressed: { backgroundColor: theme.colors.surfaceMuted },
  destructivePressed: { opacity: 0.85 },
  disabled: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
  label: { ...theme.typography.bodyStrong, textAlign: 'center' },
  primaryLabel: { color: theme.colors.onPrimary },
  secondaryLabel: { color: theme.colors.onSecondary },
  ghostLabel: { color: theme.colors.primary },
  destructiveLabel: { color: theme.colors.onPrimary },
  disabledLabel: { color: theme.colors.textMuted },
});
