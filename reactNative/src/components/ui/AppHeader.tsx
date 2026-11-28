import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme/tokens';

export function AppHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: theme.layout.touchMin,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.headerTitle,
    color: theme.colors.text,
  },
});
