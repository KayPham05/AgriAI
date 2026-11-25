import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui/ActionButton';
import { theme } from '@/theme/tokens';

export interface MockUser { email: string; fullName: string }
interface LoginScreenProps { onSuccess: (user: MockUser) => void }

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const canSubmit = email.trim().length > 0 && password.length > 0;
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>Đăng nhập</Text><Text style={styles.description}>Đăng nhập để lưu và xem lại những lần chẩn đoán.</Text>
    <View style={styles.form}><View style={styles.field}><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} /></View>
      <View style={styles.field}><Text style={styles.label}>Mật khẩu</Text><TextInput accessibilityLabel="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} /></View>
      <ActionButton label="Đăng nhập" onPress={canSubmit ? () => onSuccess({ email: email.trim(), fullName: 'Minh Kha' }) : undefined} />
    </View><Text style={styles.note}>Đăng nhập đang dùng dữ liệu mẫu trong giai đoạn dựng app shell.</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.colors.background }, content: { flexGrow: 1, justifyContent: 'center', gap: theme.spacing.md, padding: theme.spacing.gutter }, title: { ...theme.typography.display, color: theme.colors.text }, description: { ...theme.typography.body, color: theme.colors.textMuted }, form: { gap: theme.spacing.md, marginTop: theme.spacing.md }, field: { gap: theme.spacing.xs }, label: { ...theme.typography.label, color: theme.colors.text }, input: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.textMuted, borderRadius: theme.radius.input, paddingHorizontal: theme.spacing.md, color: theme.colors.text, backgroundColor: theme.colors.surface }, note: { ...theme.typography.label, color: theme.colors.textMuted, textAlign: 'center' } });
