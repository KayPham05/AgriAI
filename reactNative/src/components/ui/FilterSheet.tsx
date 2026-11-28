import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSheetProps {
  visible: boolean;
  title: string;
  options: readonly FilterOption[];
  selectedValues: readonly string[];
  onApply: (values: string[]) => void;
  onCancel: () => void;
  onReset?: () => void;
  applyLabel?: string;
  resetLabel?: string;
  cancelLabel?: string;
}

function FilterSheetContent({
  title,
  options,
  selectedValues,
  onApply,
  onCancel,
  onReset,
  applyLabel,
  resetLabel,
  cancelLabel,
}: Omit<FilterSheetProps, 'visible'> & { applyLabel: string; resetLabel: string; cancelLabel: string }) {
  const [draft, setDraft] = useState<string[]>(() => [...selectedValues]);

  function toggle(value: string) {
    setDraft((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  }

  function handleReset() {
    setDraft([]);
    onReset?.();
  }

  return (
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} style={styles.scrim} />
      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            onPress={onCancel}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>{cancelLabel}</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.options}>
          {options.map((option) => {
            const selected = draft.includes(option.value);
            return (
              <Pressable
                key={option.value}
                accessibilityRole="checkbox"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: selected }}
                onPress={() => toggle(option.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text accessible={false} style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <ActionButton label={resetLabel} variant="ghost" onPress={handleReset} />
          </View>
          <View style={styles.footerItem}>
            <ActionButton label={applyLabel} variant="primary" onPress={() => onApply(draft)} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Bottom-sheet filter modal keeping draft selections isolated until Apply is pressed. */
export function FilterSheet({
  visible,
  applyLabel = 'Áp dụng',
  resetLabel = 'Đặt lại',
  cancelLabel = 'Hủy',
  onCancel,
  ...rest
}: FilterSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      {visible && (
        <FilterSheetContent
          {...rest}
          onCancel={onCancel}
          applyLabel={applyLabel}
          resetLabel={resetLabel}
          cancelLabel={cancelLabel}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.scrim,
  },
  scrim: { flex: 1 },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.media,
    borderTopRightRadius: theme.radius.media,
    maxHeight: '80%',
    paddingTop: theme.spacing.gutter,
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.control,
  },
  title: { ...theme.typography.section, color: theme.colors.text, flex: 1 },
  closeButton: {
    minWidth: theme.layout.touchMin,
    minHeight: theme.layout.touchMin,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  closeText: { ...theme.typography.label, color: theme.colors.primary },
  scroll: { flexGrow: 0 },
  options: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.control,
    minHeight: theme.layout.touchMin,
    padding: theme.spacing.control,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceMuted,
  },
  optionPressed: { opacity: 0.8 },
  checkbox: {
    width: theme.shell.iconSize,
    height: theme.shell.iconSize,
    borderRadius: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.controlOutline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: { ...theme.typography.label, color: theme.colors.onPrimary },
  optionLabel: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  footer: { flexDirection: 'row', gap: theme.spacing.sm },
  footerItem: { flex: 1 },
});
