import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TextField } from '@/components/ui/TextField';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import {
  validateProfileForm,
  type ProfilePayload,
  type SaveProfileResult,
} from '@/features/profiles/profileMutations';
import { theme } from '@/theme/tokens';

export interface ProfileEditorScreenProps {
  mode: 'create' | 'edit';
  initialProfile?: AgriculturalProfileItem | null;
  onSave: (payload: ProfilePayload) => Promise<SaveProfileResult>;
  onSaved: (profile: AgriculturalProfileItem) => void;
  onBack: () => void;
}

/** S18 shared create/edit editor for agricultural profiles ({ name, description }). */
export function ProfileEditorScreen({
  mode,
  initialProfile,
  onSave,
  onSaved,
  onBack,
}: ProfileEditorScreenProps) {
  const initialName = initialProfile?.name ?? '';
  const initialDesc = initialProfile?.description ?? '';
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDesc);
  const [nameError, setNameError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);

  const isDirty = name !== initialName || description !== initialDesc;

  function handleBackPress() {
    if (saving) return;
    if (isDirty) setDiscardVisible(true);
    else onBack();
  }

  async function handleSubmit() {
    if (saving) return;
    const validation = validateProfileForm(name, description);
    if (!validation.valid) {
      setNameError(validation.nameError);
      return;
    }
    setNameError(undefined);
    setSubmitError(undefined);
    setSaving(true);
    try {
      const res = await onSave(validation.payload);
      if (res.kind === 'saved') {
        onSaved(res.profile);
      } else {
        setSubmitError('Chưa thể lưu hồ sơ. Vui lòng thử lại.');
      }
    } catch {
      setSubmitError('Chưa thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={handleBackPress} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          {mode === 'edit' ? 'Sửa hồ sơ nông nghiệp' : 'Tạo hồ sơ nông nghiệp'}
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <TextField
              label="Tên hồ sơ"
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (nameError) setNameError(undefined);
                if (submitError) setSubmitError(undefined);
              }}
              placeholder="Ví dụ: Ruộng lúa OM18"
              helperText="Bắt buộc, tối đa 150 ký tự."
              error={nameError}
              disabled={saving}
            />

            <TextField
              label="Mô tả (tùy chọn)"
              value={description}
              onChangeText={(val) => {
                setDescription(val);
                if (submitError) setSubmitError(undefined);
              }}
              placeholder="Ghi chú giống cây hoặc khu vực..."
              multiline
              disabled={saving}
            />

            {submitError && (
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>
                {submitError}
              </Text>
            )}

            <ActionButton label="Lưu hồ sơ" busy={saving} onPress={() => void handleSubmit()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={discardVisible}
        title="Bỏ thay đổi?"
        message="Thông tin bạn vừa nhập chưa được lưu và sẽ bị mất."
        confirmLabel="Bỏ thay đổi"
        destructive
        onConfirm={() => {
          setDiscardVisible(false);
          onBack();
        }}
        onCancel={() => setDiscardVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control,
    paddingHorizontal: theme.spacing.gutter, paddingVertical: theme.spacing.sm,
  },
  backBtn: { minHeight: theme.layout.touchMin, justifyContent: 'center' },
  backText: { ...theme.typography.label, color: theme.colors.text },
  headerTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  scrollContent: { flexGrow: 1, padding: theme.spacing.gutter },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  errorText: { ...theme.typography.caption, color: theme.colors.error },
});
