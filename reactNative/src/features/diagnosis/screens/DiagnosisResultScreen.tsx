import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { MediaPreview } from '@/components/ui/MediaPreview';
import { formatConfidencePercent, ResultSummary } from '@/components/ui/ResultSummary';
import { StatePanel } from '@/components/ui/StatePanel';
import type { SaveGuestPredictionResult } from '@/features/diagnosis/saveGuestPrediction';
import type { PredictionResult } from '@/features/diagnosis/submitPrediction';
import { theme } from '@/theme/tokens';

export interface DiagnosisResultScreenProps {
  result: PredictionResult | null;
  localImageUri?: string;
  isAuthenticated: boolean;
  onNewDiagnosis: () => void;
  onLoginToSave?: () => void;
  onSaveGuest?: (guestToken: string) => Promise<SaveGuestPredictionResult>;
  onOpenHistory?: () => void;
  onBack: () => void;
}

function isGuestExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

/** S14 diagnosis result screen with Top-K, medicine policy (raw confidence > 0.8), and Guest save flow. */
export function DiagnosisResultScreen({
  result,
  localImageUri,
  isAuthenticated,
  onNewDiagnosis,
  onLoginToSave,
  onSaveGuest,
  onOpenHistory,
  onBack,
}: DiagnosisResultScreenProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'expired' | 'error'>('idle');

  if (!result) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
        <View style={styles.body}>
          <StatePanel
            kind="empty"
            title="Chưa có kết quả chẩn đoán"
            message="Hãy chọn hoặc chụp một ảnh lá để bắt đầu."
            actionLabel="Chẩn đoán mới"
            onAction={onNewDiagnosis}
          />
        </View>
      </SafeAreaView>
    );
  }

  const pd = result.predictedPlantDisease;
  const plantName = pd.plantVietnameseName?.trim() || pd.plantName;
  const diseaseName = pd.diseaseVietnameseName?.trim() || pd.diseaseName;
  const allowMedicines = result.confidence > 0.8 && !result.warning && result.recommendedMedicines.length > 0;
  const guestExpired = saveStatus === 'expired' || isGuestExpired(result.guestExpiresAt);

  async function handleSaveGuest() {
    if (!result?.guestToken || !onSaveGuest || saveStatus === 'saving' || saveStatus === 'saved') return;
    setSaveStatus('saving');
    const outcome = await onSaveGuest(result.guestToken);
    if (outcome.kind === 'saved') setSaveStatus('saved');
    else if (outcome.kind === 'expired') setSaveStatus('expired');
    else setSaveStatus('error');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Kết quả</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <MediaPreview
            status={localImageUri ? 'ready' : 'error'}
            uri={localImageUri}
            accessibilityLabel={`Ảnh kết quả: ${diseaseName}`}
          />

          <ResultSummary
            plantName={plantName}
            conditionName={diseaseName}
            confidence={result.confidence}
            lowConfidenceWarning={result.confidence <= 0.8 || Boolean(result.warning)}
            informationPending={result.informationPending}
          />

          {result.predictionDetails.length > 0 && (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Top-K nhận diện</Text>
              {result.predictionDetails.map((detail, idx) => {
                const label = detail.plantDisease?.diseaseVietnameseName?.trim() || detail.className;
                return (
                  <Text key={`${detail.classIndex}-${idx}`} style={styles.bodyText}>
                    {`${idx + 1}. ${label} (${formatConfidencePercent(detail.confidence)})`}
                  </Text>
                );
              })}
            </View>
          )}

          {(pd.description || pd.symptoms || pd.careInstructions || pd.prevention) && (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Thông tin & Hướng chăm sóc</Text>
              {pd.description && <Text style={styles.bodyText}>{pd.description}</Text>}
              {pd.symptoms && <Text style={styles.bodyText}>{`Triệu chứng: ${pd.symptoms}`}</Text>}
              {pd.careInstructions && <Text style={styles.bodyText}>{`Chăm sóc: ${pd.careInstructions}`}</Text>}
              {pd.prevention && <Text style={styles.bodyText}>{`Phòng ngừa: ${pd.prevention}`}</Text>}
            </View>
          )}

          {allowMedicines && (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Thuốc tham khảo</Text>
              {result.recommendedMedicines.map((med) => (
                <View key={med.id} style={styles.medItem}>
                  <Text style={styles.medName}>{med.name}</Text>
                  {med.activeIngredient && <Text style={styles.caption}>{`Hoạt chất: ${med.activeIngredient}`}</Text>}
                  {med.usageInstructions && <Text style={styles.bodyText}>{med.usageInstructions}</Text>}
                  {med.warnings && <Text style={styles.caption}>{`Lưu ý: ${med.warnings}`}</Text>}
                  {med.source && <Text style={styles.caption}>{`Nguồn: ${med.source}`}</Text>}
                </View>
              ))}
            </View>
          )}

          {result.guestToken && (
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.cardTitle}>Lưu kết quả lượt khách</Text>
              {guestExpired ? (
                <StatePanel
                  kind="error"
                  title="Kết quả khách đã hết hạn lưu"
                  message="Kết quả khách này đã hết thời hạn lưu vào tài khoản."
                  actionLabel="Chẩn đoán lại"
                  onAction={onNewDiagnosis}
                />
              ) : saveStatus === 'saved' ? (
                <StatePanel
                  kind="empty"
                  title="Đã lưu vào lịch sử"
                  message="Kết quả đã được lưu vào tài khoản của bạn."
                  actionLabel={onOpenHistory ? 'Xem lịch sử' : undefined}
                  onAction={onOpenHistory}
                />
              ) : isAuthenticated ? (
                <>
                  <Text style={styles.bodyText}>Lưu kết quả này vào lịch sử tài khoản mà không cần phân tích lại.</Text>
                  {saveStatus === 'error' && (
                    <Text accessibilityRole="alert" style={styles.errorText}>Chưa thể lưu kết quả lúc này. Vui lòng thử lại.</Text>
                  )}
                  <ActionButton
                    label="Lưu kết quả"
                    busy={saveStatus === 'saving'}
                    onPress={() => void handleSaveGuest()}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.bodyText}>Đăng nhập để lưu kết quả này vào lịch sử của bạn.</Text>
                  <ActionButton label="Đăng nhập để lưu" onPress={onLoginToSave} />
                </>
              )}
            </View>
          )}

          <ActionButton label="Chẩn đoán mới" variant="secondary" onPress={onNewDiagnosis} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control,
    paddingHorizontal: theme.spacing.gutter, paddingVertical: theme.spacing.sm,
  },
  backBtn: { minHeight: theme.layout.touchMin, justifyContent: 'center' },
  backText: { ...theme.typography.label, color: theme.colors.text },
  headerTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xl },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  body: { flex: 1, padding: theme.spacing.gutter, justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.card, padding: theme.spacing.md, gap: theme.spacing.sm,
  },
  cardTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  bodyText: { ...theme.typography.body, color: theme.colors.text },
  caption: { ...theme.typography.caption, color: theme.colors.textMuted },
  errorText: { ...theme.typography.caption, color: theme.colors.error },
  medItem: { gap: theme.spacing.xs, paddingTop: theme.spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  medName: { ...theme.typography.bodyStrong, color: theme.colors.text },
});
