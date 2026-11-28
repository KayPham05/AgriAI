import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { theme } from '@/theme/tokens';

export interface ProfilePickerSheetProps {
  visible: boolean;
  profiles: readonly AgriculturalProfileItem[];
  selectedProfileId: string | null;
  loading?: boolean;
  onSelect: (profileId: string | null) => void;
  onClose: () => void;
}

/** Bottom-sheet picker for User's agricultural profiles, including "Không gắn hồ sơ". */
export function ProfilePickerSheet({
  visible,
  profiles,
  selectedProfileId,
  loading = false,
  onSelect,
  onClose,
}: ProfilePickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng chọn hồ sơ" onPress={onClose} style={styles.scrim} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>Chọn hồ sơ nông nghiệp</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.options}>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Không gắn hồ sơ"
              accessibilityState={{ selected: selectedProfileId === null }}
              onPress={() => { onSelect(null); onClose(); }}
              style={[styles.row, selectedProfileId === null && styles.rowSelected]}
            >
              <Text style={styles.rowTitle}>Không gắn hồ sơ</Text>
              <Text style={styles.rowSub}>Lưu kết quả chung vào lịch sử</Text>
            </Pressable>
            {loading && <Text style={styles.loading}>Đang tải danh sách hồ sơ...</Text>}
            {profiles.map((profile) => {
              const selected = selectedProfileId === profile.id;
              return (
                <Pressable
                  key={profile.id}
                  accessibilityRole="radio"
                  accessibilityLabel={profile.name}
                  accessibilityState={{ selected }}
                  onPress={() => { onSelect(profile.id); onClose(); }}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <Text style={styles.rowTitle}>{profile.name}</Text>
                  <Text style={styles.rowSub}>{`${profile.predictionCount} lượt chẩn đoán`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.scrim },
  scrim: { flex: 1 },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.media,
    borderTopRightRadius: theme.radius.media,
    maxHeight: '75%',
    padding: theme.spacing.gutter,
    gap: theme.spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...theme.typography.section, color: theme.colors.text, flex: 1 },
  closeBtn: { minWidth: theme.layout.touchMin, minHeight: theme.layout.touchMin, justifyContent: 'center', alignItems: 'center' },
  closeText: { ...theme.typography.label, color: theme.colors.primary },
  scroll: { flexGrow: 0 },
  options: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  row: {
    minHeight: theme.layout.touchMin,
    padding: theme.spacing.control,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  rowSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surfaceMuted },
  rowTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  rowSub: { ...theme.typography.caption, color: theme.colors.textMuted },
  loading: { ...theme.typography.body, color: theme.colors.textMuted },
});
