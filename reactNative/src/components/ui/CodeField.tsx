import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/theme/tokens';

export interface CodeFieldProps {
  label?: string;
  value: string;
  onChangeText: (code: string) => void;
  length?: number;
  helperText?: string;
  error?: string;
  loading?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onSubmitEditing?: () => void;
}

const defaultHelp = 'Có thể dán hoặc tự điền mã từ thiết bị.';

/** Accessible single-field numeric OTP input supporting empty, partial, error, and loading states. */
export function CodeField({
  label = 'Mã xác minh 8 số',
  value,
  onChangeText,
  length = 8,
  helperText = defaultHelp,
  error,
  loading = false,
  busy = false,
  disabled = false,
  onSubmitEditing,
}: CodeFieldProps) {
  const [focused, setFocused] = useState(false);
  const isBusy = loading || busy;
  const isDisabled = disabled || isBusy;
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && !hasError && !isDisabled && styles.focused,
          hasError && styles.invalid,
          isDisabled && styles.disabled,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? helperText}
          accessibilityState={{ disabled: isDisabled, busy: isBusy }}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder={`Nhập mã ${length} số`}
          placeholderTextColor={theme.colors.textMuted}
          editable={!isDisabled}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(raw) => onChangeText(raw.replace(/[^0-9]/g, '').slice(0, length))}
          onSubmitEditing={onSubmitEditing}
          style={styles.input}
        />
        {isBusy && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />}
      </View>
      <Text
        accessibilityRole={hasError ? 'alert' : undefined}
        accessibilityLiveRegion="polite"
        style={hasError ? styles.error : styles.helper}
      >
        {error ?? (isBusy ? 'Đang xác minh mã...' : helperText)}
      </Text>
    </View>
  );
}

export const OtpInput = CodeField;

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  label: { ...theme.typography.label, color: theme.colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.fieldMinHeight,
    borderWidth: 1,
    borderRadius: theme.radius.input,
    borderColor: theme.colors.controlOutline,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.control,
  },
  input: {
    ...theme.typography.subtitle,
    color: theme.colors.text,
    flex: 1,
    paddingVertical: theme.spacing.control,
    letterSpacing: theme.spacing.xs,
  },
  focused: { borderColor: theme.colors.focus, borderWidth: 2 },
  invalid: { borderColor: theme.colors.error, borderWidth: 2 },
  disabled: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
  spinner: { marginStart: theme.spacing.sm },
  helper: { ...theme.typography.caption, color: theme.colors.textMuted },
  error: { ...theme.typography.caption, color: theme.colors.error },
});
