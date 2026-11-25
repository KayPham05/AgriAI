import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/theme/tokens';

export function PlaceholderScreen({ title, message }: { title: string; message: string }) {
  return <SafeAreaView style={styles.screen}><View style={styles.content}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.colors.background }, content: { flex: 1, justifyContent: 'center', padding: theme.spacing.gutter, gap: theme.spacing.sm }, title: { ...theme.typography.title, color: theme.colors.text }, message: { ...theme.typography.body, color: theme.colors.textMuted } });
