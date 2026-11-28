import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

export type WelcomeIntent = 'guest-diagnosis' | 'login' | 'catalog';

interface WelcomeScreenProps {
  onNavigate?: (intent: WelcomeIntent) => void;
  availableIntents?: readonly WelcomeIntent[];
}

export function WelcomeScreen({ onNavigate, availableIntents }: WelcomeScreenProps = {}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const { width } = useWindowDimensions();
  function action(intent: WelcomeIntent) {
    if (!onNavigate || (availableIntents && !availableIntents.includes(intent))) return undefined;
    return () => onNavigate(intent);
  }
  const diagnosis = action('guest-diagnosis');
  const login = action('login');
  const catalog = action('catalog');
  const unavailableHint = 'Chức năng đang được chuẩn bị.';

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.brandSurface}>
        <View style={styles.brandContent}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../../../assets/agrivision-leaf-mark.png')}
              accessible={false}
              style={styles.mark}
              resizeMode="contain"
            />
            <Text style={styles.brand}>AgriVision</Text>
          </View>
          <Text style={styles.brandCaption}>Sổ tay vườn nhà</Text>
        </View>
      </SafeAreaView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introduction}>
          <View style={styles.media}>
            {photoFailed ? (
              <Text style={styles.photoFallback}>Quan sát màu sắc và bề mặt lá.</Text>
            ) : (
              <Image
                source={require('../../../../assets/welcome-rice-field.png')}
                accessible
                accessibilityRole="image"
                accessibilityLabel="Bàn tay quan sát cây lúa trên cánh đồng"
                resizeMode="cover"
                style={styles.photo}
                onError={() => setPhotoFailed(true)}
              />
            )}
          </View>
          <View style={styles.heroContent}>
            <Text
              accessibilityRole="header"
              style={[styles.title, width < theme.layout.compactWidth && styles.compactTitle]}
            >
              Quan sát chiếc lá.{"\n"}Hiểu thêm về cây.
            </Text>
            <Text style={styles.description}>
              Chọn một ảnh lá để tham khảo tình trạng cây và tra cứu thông tin.
            </Text>
            <ActionButton
              label="Chẩn đoán ngay"
              variant="secondary"
              onPress={diagnosis}
              accessibilityHint={diagnosis ? 'Mở bước chọn nguồn ảnh với tư cách khách.' : unavailableHint}
            />
          </View>
        </View>
        <SafeAreaView edges={['bottom']} style={styles.actionsSurface}>
          <View style={styles.actions}>
            <ActionButton
              label="Đăng nhập"
              variant="secondary"
              onPress={login}
              accessibilityHint={login ? 'Mở màn hình đăng nhập.' : unavailableHint}
            />
            <ActionButton
              label="Tra cứu"
              variant="secondary"
              onPress={catalog}
              accessibilityHint={catalog ? 'Tra cứu thông tin cây trồng mà không cần đăng nhập.' : unavailableHint}
            />
          </View>
          {!diagnosis && !catalog && (
            <Text style={styles.unavailable}>Chẩn đoán và tra cứu đang được chuẩn bị.</Text>
          )}
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  brandSurface: { backgroundColor: theme.colors.primaryPressed },
  brandContent: {
    width: '100%', maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.gutter, paddingVertical: theme.spacing.control,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  mark: {
    width: theme.welcome.markWidth, height: theme.welcome.markHeight,
    tintColor: theme.colors.onPrimary,
  },
  brand: { ...theme.typography.brand, color: theme.colors.onPrimary, flexShrink: 1 },
  brandCaption: { ...theme.typography.label, color: theme.colors.secondary, flexShrink: 1 },
  introduction: { backgroundColor: theme.colors.primaryPressed },
  media: {
    width: '100%', aspectRatio: theme.welcome.photoAspectRatio,
    maxHeight: theme.welcome.photoMaxHeight,
    maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: {
    ...theme.typography.body, color: theme.colors.textMuted,
    textAlign: 'center', padding: theme.spacing.md,
  },
  heroContent: {
    width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center',
    padding: theme.spacing.gutter, gap: theme.spacing.sm,
  },
  title: { ...theme.typography.display, color: theme.colors.onPrimary },
  compactTitle: { ...theme.typography.title },
  description: { ...theme.typography.body, color: theme.colors.secondary },
  actionsSurface: {
    flexGrow: 1, width: '100%', maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center', padding: theme.spacing.gutter, gap: theme.spacing.md,
  },
  actions: { gap: theme.spacing.control },
  unavailable: { ...theme.typography.body, color: theme.colors.textMuted },
});
