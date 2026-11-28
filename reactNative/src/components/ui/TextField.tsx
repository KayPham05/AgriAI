import { useState, type ComponentRef, type RefObject } from 'react';
import {
  Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type ReturnKeyTypeOptions,
  type TextInputProps,
} from 'react-native';

import { theme } from '@/theme/tokens';

export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  secureTextEntry?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  maxLength?: number;
  accessibilityHint?: string;
  inputRef?: RefObject<ComponentRef<typeof TextInput> | null>;
}

/** Accessible native text input supporting default, focused, error, disabled, and secure states. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  error,
  secureTextEntry = false,
  disabled = false,
  multiline = false,
  keyboardType,
  autoComplete,
  textContentType,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  returnKeyType,
  onSubmitEditing,
  maxLength,
  accessibilityHint,
  inputRef,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.row,
          multiline && styles.multilineRow,
          focused && !hasError && !disabled && styles.focused,
          hasError && styles.invalid,
          disabled && styles.disabledRow,
        ]}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={error ?? accessibilityHint ?? helperText}
          accessibilityState={{ disabled }}
          editable={!disabled}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secureTextEntry && !revealed}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCapitalize={secureTextEntry ? 'none' : autoCapitalize}
          autoCorrect={secureTextEntry ? false : autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.multilineInput, disabled && styles.disabledText]}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={() => setRevealed((prev) => !prev)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{revealed ? 'Ẩn' : 'Hiện'}</Text>
          </Pressable>
        )}
      </View>
      {(error || helperText) && (
        <Text
          accessibilityRole={hasError ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
          style={hasError ? styles.error : styles.helper}
        >
          {error ?? helperText}
        </Text>
      )}
    </View>
  );
}

export const Input = TextField;

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  label: { ...theme.typography.label, color: theme.colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.layout.fieldMinHeight,
    borderWidth: 1,
    borderColor: theme.colors.controlOutline,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.surface,
  },
  multilineRow: {
    minHeight: theme.layout.multilineMinHeight,
    alignItems: 'flex-start',
  },
  focused: {
    borderColor: theme.colors.focus,
    borderWidth: 2,
  },
  invalid: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  disabledRow: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    paddingHorizontal: theme.spacing.control,
    paddingVertical: theme.spacing.control,
  },
  multilineInput: {
    minHeight: theme.layout.multilineMinHeight,
    textAlignVertical: 'top',
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
  toggle: {
    minWidth: theme.layout.touchMin,
    minHeight: theme.layout.touchMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.control,
  },
  toggleText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  helper: { ...theme.typography.caption, color: theme.colors.textMuted },
  error: { ...theme.typography.caption, color: theme.colors.error },
});
