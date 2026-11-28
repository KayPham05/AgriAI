import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { CodeField } from '@/components/ui/CodeField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FilterSheet, type FilterOption } from '@/components/ui/FilterSheet';
import { ListRow } from '@/components/ui/ListRow';
import { MediaPreview } from '@/components/ui/MediaPreview';
import { ResultSummary } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import { TextField } from '@/components/ui/TextField';
import { theme } from '@/theme/tokens';

const filterOptions: readonly FilterOption[] = [
  { value: 'rice', label: 'Cây lúa' },
  { value: 'mango', label: 'Cây xoài' },
  { value: 'tomato', label: 'Cây cà chua' },
];

/** Internal design-system gallery displaying every shared component and its required states. */
export function ComponentGalleryScreen() {
  const [textValue, setTextValue] = useState('Lúa OM18');
  const [secretValue, setSecretValue] = useState('MatKhau123');
  const [otpValue, setOtpValue] = useState('1234');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(['rice']);
  const [dialogVisible, setDialogVisible] = useState(false);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <AppHeader title="Component Gallery" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>1. Button</Text>
              <ActionButton label="Primary" onPress={() => undefined} />
              <ActionButton label="Secondary" variant="secondary" onPress={() => undefined} />
              <ActionButton label="Ghost" variant="ghost" onPress={() => undefined} />
              <ActionButton label="Destructive" variant="destructive" onPress={() => undefined} />
              <ActionButton label="Loading" loading onPress={() => undefined} />
              <ActionButton label="Disabled" disabled />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>2. TextField (Input)</Text>
              <TextField
                label="Tên hồ sơ"
                value={textValue}
                onChangeText={setTextValue}
                helperText="Nhập tên thửa ruộng hoặc vườn cây."
              />
              <TextField
                label="Mật khẩu"
                value={secretValue}
                onChangeText={setSecretValue}
                secureTextEntry
              />
              <TextField
                label="Trường lỗi"
                value=""
                onChangeText={() => undefined}
                error="Vui lòng nhập thông tin bắt buộc."
              />
              <TextField
                label="Trường bị khóa"
                value="user@example.test"
                onChangeText={() => undefined}
                disabled
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>3. CodeField (OtpInput)</Text>
              <CodeField value={otpValue} onChangeText={setOtpValue} />
              <CodeField
                label="OTP lỗi"
                value="00000000"
                onChangeText={() => undefined}
                error="Mã không hợp lệ hoặc đã hết hạn."
              />
              <CodeField label="OTP đang xác minh" value="12345678" onChangeText={() => undefined} loading />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>4. ListRow</Text>
              <ListRow
                title="Đốm nâu trên lá lúa"
                subtitle="19/11/2026 · Mẫu đã lưu"
                icon={require('../../../../assets/shell/sprout.png')}
                onPress={() => undefined}
              />
              <ListRow
                title="Mục chưa khả dụng"
                subtitle="Đang chuẩn bị kết nối"
                icon={require('../../../../assets/shell/lock-keyhole.png')}
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>5. StatePanel</Text>
              <StatePanel
                kind="loading"
                title="Đang tải dữ liệu"
                message="Vui lòng đợi trong giây lát."
              />
              <StatePanel
                kind="empty"
                title="Chưa có kết quả"
                message="Chưa tìm thấy nội dung phù hợp."
                actionLabel="Xóa bộ lọc"
                onAction={() => undefined}
              />
              <StatePanel
                kind="error"
                title="Mất kết nối mạng"
                message="Chưa có kết nối mạng. Ảnh đang chọn vẫn được giữ."
                actionLabel="Thử lại"
                onAction={() => undefined}
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>6. PhotoFrame (MediaPreview)</Text>
              <MediaPreview
                status="ready"
                source={require('../../../../assets/welcome-rice-field.png')}
                accessibilityLabel="Ảnh mẫu lá lúa"
                onReplace={() => undefined}
                onRemove={() => undefined}
              />
              <MediaPreview status="loading" />
              <MediaPreview status="expired" />
              <MediaPreview status="error" />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>7. ResultSummary</Text>
              <ResultSummary
                plantName="Cây lúa"
                conditionName="Bệnh đốm nâu"
                confidence={0.75}
                timestamp="19/11/2026"
                snapshotLabel="Bản lưu lịch sử"
                informationPending
              />
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>8. FilterSheet & ConfirmDialog</Text>
              <Text style={styles.caption}>Bộ lọc đang chọn: {selectedFilters.join(', ') || 'Không có'}</Text>
              <ActionButton label="Mở FilterSheet" variant="secondary" onPress={() => setFilterVisible(true)} />
              <ActionButton label="Mở ConfirmDialog" variant="destructive" onPress={() => setDialogVisible(true)} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FilterSheet
        visible={filterVisible}
        title="Lọc theo cây trồng"
        options={filterOptions}
        selectedValues={selectedFilters}
        onApply={(next) => {
          setSelectedFilters(next);
          setFilterVisible(false);
        }}
        onCancel={() => setFilterVisible(false)}
      />

      <ConfirmDialog
        visible={dialogVisible}
        title="Xóa kết quả chẩn đoán"
        message="Thao tác này sẽ xóa kết quả khỏi lịch sử của bạn và không thể hoàn tác."
        confirmLabel="Xóa kết quả"
        destructive
        onConfirm={() => setDialogVisible(false)}
        onCancel={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center',
    gap: theme.spacing.lg,
  },
  section: { gap: theme.spacing.control },
  sectionTitle: { ...theme.typography.section, color: theme.colors.text },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
});
