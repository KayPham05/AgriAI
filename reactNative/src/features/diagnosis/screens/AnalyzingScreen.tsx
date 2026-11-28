import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatePanel } from '@/components/ui/StatePanel';
import type { SelectedLeafImage } from '@/features/diagnosis/diagnosisDraft';
import type { PredictionResult, SubmitPredictionResult } from '@/features/diagnosis/submitPrediction';
import { theme } from '@/theme/tokens';

export interface AnalyzingScreenProps {
  image: SelectedLeafImage | null;
  isAuthenticated: boolean;
  onSubmit: (signal: AbortSignal) => Promise<SubmitPredictionResult>;
  onCompleted: (result: PredictionResult) => void;
  onCancel: () => void;
  onOpenHistory?: () => void;
}

/** S13 processing screen with single-flight upload guard and no auto-retry on timeout. */
export function AnalyzingScreen({
  image,
  isAuthenticated,
  onSubmit,
  onCompleted,
  onCancel,
  onOpenHistory,
}: AnalyzingScreenProps) {
  const [status, setStatus] = useState<'analyzing' | 'timeout' | 'error'>('analyzing');
  const inFlightRef = useRef<AbortController | null>(null);
  const completedRef = useRef(false);

  const runUpload = useCallback(() => {
    if (!image || inFlightRef.current || completedRef.current) return;
    const controller = new AbortController();
    inFlightRef.current = controller;
    void onSubmit(controller.signal).then((outcome) => {
      if (inFlightRef.current === controller) inFlightRef.current = null;
      if (controller.signal.aborted || outcome.kind === 'cancelled') return;
      if (outcome.kind === 'succeeded') {
        completedRef.current = true;
        onCompleted(outcome.result);
      } else if (outcome.kind === 'error' && outcome.reason === 'timeout') {
        setStatus('timeout');
      } else {
        setStatus('error');
      }
    }).catch(() => {
      if (inFlightRef.current === controller) inFlightRef.current = null;
      if (!controller.signal.aborted) setStatus('error');
    });
  }, [image, onSubmit, onCompleted]);

  useEffect(() => {
    runUpload();
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [runUpload]);

  function handleRetry() {
    if (inFlightRef.current || completedRef.current) return;
    setStatus('analyzing');
    runUpload();
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => {
            inFlightRef.current?.abort();
            onCancel();
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Đang phân tích</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {image && (
            <Image
              source={{ uri: image.uri }}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Ảnh đang phân tích: ${image.fileName}`}
              resizeMode="cover"
              style={styles.thumb}
            />
          )}

          {status === 'analyzing' ? (
            <View style={styles.card}>
              <View style={styles.row}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text accessibilityRole="header" style={styles.cardTitle}>Đang gửi ảnh và phân tích...</Text>
              </View>
              <Text style={styles.description}>
                Quá trình có thể mất vài giây khi mạng yếu. Quay lại chỉ dừng theo dõi trên ứng dụng.
              </Text>
            </View>
          ) : status === 'timeout' ? (
            <StatePanel
              kind="error"
              title="Chưa xác nhận được kết quả"
              message={
                isAuthenticated
                  ? 'Hãy kiểm tra lịch sử trước khi gửi lại để tránh tạo lượt trùng.'
                  : 'Chưa nhận được kết quả. Gửi lại có thể tạo một lượt xử lý mới.'
              }
              actionLabel={isAuthenticated && onOpenHistory ? 'Xem lịch sử' : 'Gửi lại chủ ý'}
              onAction={isAuthenticated && onOpenHistory ? onOpenHistory : handleRetry}
              secondaryActionLabel={isAuthenticated && onOpenHistory ? 'Gửi lại chủ ý' : 'Quay lại'}
              onSecondaryAction={isAuthenticated && onOpenHistory ? handleRetry : onCancel}
            />
          ) : (
            <StatePanel
              kind="error"
              title="Không thể phân tích ảnh"
              message="Ảnh đang chọn vẫn được giữ. Vui lòng thử lại."
              actionLabel="Thử lại"
              onAction={handleRetry}
              secondaryActionLabel="Quay lại"
              onSecondaryAction={onCancel}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.control,
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing.sm,
  },
  backBtn: { minHeight: theme.layout.touchMin, justifyContent: 'center' },
  backText: { ...theme.typography.label, color: theme.colors.text },
  headerTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  scrollContent: { flexGrow: 1, padding: theme.spacing.gutter },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  thumb: { width: 120, height: 90, borderRadius: theme.radius.input, backgroundColor: theme.colors.surfaceMuted },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    gap: theme.spacing.control,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control },
  cardTitle: { ...theme.typography.subtitle, flex: 1, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
});
