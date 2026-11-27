import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme/tokens';

// Existing terms from the web registration form (LoginModal.tsx).
const sections = [
  {
    "title": "Quyền sở hữu trí tuệ",
    "paragraphs": [
      "Tên gọi, logo, giao diện, mã nguồn, mô hình AI, dữ liệu, tài liệu và nội dung do AgriAI phát triển thuộc quyền sở hữu của AgriAI hoặc bên cấp phép hợp pháp."
    ]
  },
  {
    "title": "Các hành vi không được phép",
    "paragraphs": [
      "Sao chép, chiếm đoạt, sửa đổi hoặc phân phối mã nguồn, giao diện, mô hình AI, dữ liệu hay tài liệu của AgriAI khi chưa được cho phép.",
      "Đảo ngược, giải mã, trích xuất mô hình hoặc dùng kỹ thuật tự động để thu thập dữ liệu và tái tạo sản phẩm cạnh tranh.",
      "Mạo danh AgriAI, sử dụng trái phép tên thương mại, logo hoặc tuyên bố sản phẩm của AgriAI là sản phẩm của mình.",
      "Xâm nhập, dò quét lỗ hổng, phá hoại hệ thống, vượt giới hạn truy cập hoặc gây gián đoạn dịch vụ.",
      "Tải lên mã độc, nội dung bất hợp pháp, dữ liệu xâm phạm bản quyền, quyền riêng tư hoặc quyền của tổ chức và cá nhân khác.",
      "Bán lại, cho thuê hoặc khai thác dịch vụ vì mục đích thương mại khi chưa có chấp thuận bằng văn bản."
    ]
  },
  {
    "title": "Trách nhiệm sử dụng",
    "paragraphs": [
      "Kết quả chẩn đoán chỉ mang tính hỗ trợ tham khảo, không thay thế ý kiến chuyên gia. Vi phạm có thể dẫn đến khóa tài khoản và xử lý theo quy định pháp luật."
    ]
  }
] as const;

type Props = { checked: boolean; disabled: boolean; error?: string; onChange: (checked: boolean) => void; onReadComplete: () => void };

export function RegistrationConsent({ checked, disabled, error, onChange, onReadComplete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const measurements = useRef({ content: 0, viewport: 0, offset: 0 });
  const checkboxDisabled = disabled || !hasReachedEnd;

  function checkEnd() {
    const { content, viewport, offset } = measurements.current;
    if (!hasReachedEnd && content > 0 && viewport > 0 && offset + viewport >= content - theme.spacing.xs) {
      setHasReachedEnd(true);
      onReadComplete();
    }
  }

  function openTerms() {
    measurements.current = { content: 0, viewport: 0, offset: 0 };
    setExpanded(true);
  }
  return (
    <View style={styles.group}>
      <View style={styles.consent}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Tôi đồng ý với Điều khoản sử dụng AgriAI"
          accessibilityState={{ checked, disabled: checkboxDisabled }}
          accessibilityHint={error ?? (!hasReachedEnd ? 'Mở điều khoản và cuộn tới cuối để bật ô đồng ý.' : undefined)}
          disabled={checkboxDisabled}
          onPress={() => { if (!checkboxDisabled) onChange(!checked); }}
          style={styles.checkboxTouch}
        >
          <View style={[styles.box, checkboxDisabled && styles.unavailable, checked && styles.checked, Boolean(error) && styles.invalid]}>
            {checked && <Text accessible={false} style={styles.tick}>{'✓'}</Text>}
          </View>
        </Pressable>
        <Text style={styles.label}>
          {'Tôi đồng ý với '}
          <Text
            accessibilityRole="button"
            accessibilityLabel="Điều khoản sử dụng AgriAI"
            accessibilityState={{ expanded }}
            onPress={openTerms}
            style={styles.readLabel}
          >
            {'Điều khoản sử dụng AgriAI'}
          </Text>
          {'.'}
        </Text>
      </View>
      {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
      {!hasReachedEnd && <Text style={styles.body}>{'Mở điều khoản và cuộn tới cuối để bật ô đồng ý.'}</Text>}
      {expanded && (
        <Modal visible onRequestClose={() => setExpanded(false)}>
          <SafeAreaView style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>{'Điều khoản sử dụng AgriAI'}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng điều khoản"
                onPress={() => setExpanded(false)}
                style={styles.checkboxTouch}
              >
                <Text style={styles.readLabel}>{'Đóng'}</Text>
              </Pressable>
            </View>
            <ScrollView
              accessibilityLabel="Nội dung điều khoản sử dụng AgriAI"
              style={styles.scroll}
              contentContainerStyle={styles.terms}
              scrollEventThrottle={16}
              onLayout={({ nativeEvent }) => { measurements.current.viewport = nativeEvent.layout.height; checkEnd(); }}
              onContentSizeChange={(_, height) => { measurements.current.content = height; checkEnd(); }}
              onScroll={({ nativeEvent }) => {
                measurements.current = {
                  content: nativeEvent.contentSize.height,
                  viewport: nativeEvent.layoutMeasurement.height,
                  offset: nativeEvent.contentOffset.y,
                };
                checkEnd();
              }}
            >
              {sections.map(section => (
                <View key={section.title} style={styles.group}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
                  {section.paragraphs.map(paragraph => <Text key={paragraph} style={styles.body}>{paragraph}</Text>)}
                </View>
              ))}
            </ScrollView>
            <Text accessibilityLiveRegion="polite" style={styles.readStatus}>
              {hasReachedEnd ? 'Bạn có thể đóng điều khoản và tích ô đồng ý.' : 'Cuộn đến cuối điều khoản để bật ô đồng ý.'}
            </Text>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing.sm },
  consent: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control, minHeight: theme.layout.touchMin },
  box: { width: theme.login.iconSize, height: theme.login.iconSize, borderWidth: 1,
    borderColor: theme.colors.textMuted, borderRadius: theme.spacing.xs, alignItems: 'center', justifyContent: 'center' },
  unavailable: { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
  checked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  invalid: { borderColor: theme.colors.error },
  tick: { ...theme.typography.subtitle, color: theme.colors.onPrimary },
  label: { ...theme.typography.label, color: theme.colors.text, flex: 1 },
  error: { ...theme.login.caption, color: theme.colors.error },
  checkboxTouch: { minWidth: theme.layout.touchMin, minHeight: theme.layout.touchMin, justifyContent: 'center', alignItems: 'center' },
  readLabel: { ...theme.typography.label, color: theme.colors.primary, textDecorationLine: 'underline' },
  modal: { flex: 1, backgroundColor: theme.colors.surface },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.gutter },
  modalTitle: { ...theme.typography.subtitle, flex: 1, color: theme.colors.text },
  scroll: { flex: 1 },
  terms: { gap: theme.spacing.md, padding: theme.spacing.gutter, maxWidth: theme.layout.contentMaxWidth, width: '100%', alignSelf: 'center' },
  readStatus: { ...theme.typography.label, padding: theme.spacing.gutter, color: theme.colors.primary },
  sectionTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.textMuted },
});
