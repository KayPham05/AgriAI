import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { theme } from '@/theme/tokens';

interface ListRowProps {
  title: string;
  subtitle: string;
  icon?: ImageSourcePropType;
  onPress?: () => void;
  accessibilityHint?: string;
}

export function ListRow({ title, subtitle, icon, onPress, accessibilityHint }: ListRowProps) {
  const disabled = !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {icon && (
        <View style={styles.iconBox}>
          <Image source={icon} accessible={false} style={styles.icon} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Image source={require('../../../assets/shell/chevron-right.png')} accessible={false} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.control,
    minHeight: theme.shell.rowMinHeight,
    paddingVertical: theme.spacing.sm,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.78 },
  iconBox: {
    width: theme.shell.rowThumbnailSize,
    height: theme.shell.rowThumbnailSize,
    borderRadius: theme.radius.input,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    width: theme.shell.iconSize,
    height: theme.shell.iconSize,
    flexShrink: 0,
  },
  copy: { flex: 1, gap: theme.spacing.xs },
  title: { ...theme.typography.bodyStrong, color: theme.colors.text },
  subtitle: { ...theme.typography.caption, color: theme.colors.textMuted },
});
