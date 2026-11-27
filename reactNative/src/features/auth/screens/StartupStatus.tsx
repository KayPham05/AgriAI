import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme/tokens';

type StatusKind = 'loading' | 'network' | 'timeout' | 'unavailable' | 'unsupported-account';

const copy = {
  loading: { title: 'Đang kiểm tra phiên', message: 'Vui lòng chờ trong giây lát.' },
  network: { title: 'Chưa kết nối được', message: 'Kiểm tra kết nối mạng rồi thử lại.' },
  timeout: { title: 'Kết nối quá thời gian chờ', message: 'Phiên đã lưu vẫn được giữ. Bạn có thể thử lại.' },
  unavailable: { title: 'Chưa thể kiểm tra phiên', message: 'Vui lòng thử lại sau ít phút.' },
  'unsupported-account': {
    title: 'Tài khoản chưa được hỗ trợ',
    message: 'Hãy sử dụng bản web để truy cập bằng tài khoản này.',
  },
};

function LoadingIcon() {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    let observedChange = false;
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    }));
    function update(reduced: boolean) {
      animation.stop();
      rotation.setValue(0);
      if (!reduced) animation.start();
    }
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      observedChange = true;
      update(reduced);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active && !observedChange) update(reduced);
    }).catch(() => {
      // Keep the indicator static when the motion preference is unavailable.
    });
    return () => {
      active = false;
      subscription.remove();
      animation.stop();
    };
  }, [rotation]);

  return (
    <Animated.Image
      accessible={false}
      source={require('../../../../assets/startup/loading.png')}
      style={[styles.icon, { transform: [{ rotate: rotation.interpolate({
        inputRange: [0, 1], outputRange: ['0deg', '360deg'],
      }) }] }]}
    />
  );
}

export function StartupStatus({ kind, onRetry }: { kind: StatusKind; onRetry?: () => void }) {
  const loading = kind === 'loading';
  const { title, message } = copy[kind];
  const icon = kind === 'network'
    ? require('../../../../assets/startup/network.png')
    : require('../../../../assets/startup/alert.png');

  return (
    <View style={styles.card}>
      <View style={styles.status} accessibilityLiveRegion="polite">
        <View style={styles.heading}>
          {loading ? <LoadingIcon /> : <Image accessible={false} source={icon} style={styles.icon} />}
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: loading, disabled: loading }}
          disabled={loading}
          onPress={onRetry}
          style={({ pressed }) => [styles.button, (pressed || loading) && styles.buttonFeedback]}
        >
          <Text style={styles.buttonLabel}>Thử lại</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', maxWidth: theme.startup.cardMaxWidth, alignSelf: 'center',
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.card, padding: theme.spacing.md, gap: theme.spacing.sm,
  },
  status: { gap: theme.spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control },
  icon: { width: theme.startup.iconSize, height: theme.startup.iconSize, flexShrink: 0 },
  title: { ...theme.typography.subtitle, flex: 1, color: theme.colors.text },
  message: { ...theme.typography.body, lineHeight: theme.startup.bodyLineHeight, color: theme.colors.textMuted },
  button: {
    minHeight: theme.layout.touchMin, padding: theme.spacing.control, alignItems: 'center',
    justifyContent: 'center', backgroundColor: theme.colors.secondary, borderRadius: theme.radius.pill,
  },
  buttonFeedback: { opacity: 0.8 },
  buttonLabel: { ...theme.typography.bodyStrong, color: theme.colors.onSecondary, textAlign: 'center' },
});
