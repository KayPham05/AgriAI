import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { AppHeader } from '@/components/ui/AppHeader';
import { theme } from '@/theme/tokens';

interface DiagnosisScreenProps {
  onCapture?: () => void;
  onPickLibrary?: () => void;
}

export function DiagnosisScreen({ onCapture, onPickLibrary }: DiagnosisScreenProps = {}) {
  const unavailableHint = 'Chức năng đang được chuẩn bị.';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader title="Chẩn đoán" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.guidance}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Chụp hoặc chọn ảnh lá</Text>
            <Text style={styles.description}>Chọn một lá rõ nét, đủ sáng và nằm trọn trong ảnh.</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image source={require('../../../../assets/shell/camera.png')} accessible={false} style={styles.icon} />
              <Text style={styles.cardTitle}>Một ảnh mỗi lượt</Text>
            </View>
            <ActionButton
              label="Chụp ảnh"
              onPress={onCapture}
              accessibilityHint={onCapture ? 'Mở máy ảnh để chụp một lá cây.' : unavailableHint}
            />
            <ActionButton
              label="Chọn thư viện"
              variant="secondary"
              onPress={onPickLibrary}
              accessibilityHint={onPickLibrary ? 'Chọn một ảnh lá từ thư viện thiết bị.' : unavailableHint}
            />
          </View>
          {!onCapture && !onPickLibrary && (
            <Text style={styles.note}>Chụp và phân tích ảnh lá đang được chuẩn bị.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingTop: theme.spacing.control,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.gutter,
  },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.lg },
  guidance: { gap: theme.spacing.control },
  sectionTitle: { ...theme.typography.section, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.control,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control },
  icon: { width: theme.shell.iconSize, height: theme.shell.iconSize, flexShrink: 0 },
  cardTitle: { ...theme.typography.bodyStrong, flex: 1, color: theme.colors.text },
  note: { ...theme.typography.caption, color: theme.colors.textMuted },
});
