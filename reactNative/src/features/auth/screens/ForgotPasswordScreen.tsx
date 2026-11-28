import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActionButton } from '@/components/ui/ActionButton';
import { PasswordRecoverySteps, type PasswordRecoveryActions } from '@/features/auth/screens/PasswordRecoverySteps';
import { useAuthMotion } from '@/features/auth/screens/useAuthMotion';
import type { LoginError, LoginFieldErrors, PasswordResetRequestResult } from '@/features/auth/submitLogin';
import { theme } from '@/theme/tokens';

type Props = {
  initialEmail?: string;
  onBack: () => void;
  recoveryActions?: PasswordRecoveryActions;
  onRequestReset: (email: string, signal: AbortSignal) => Promise<PasswordResetRequestResult>;
};
const fieldErrors = { required: 'Vui lòng nhập email.', format: 'Nhập địa chỉ email hợp lệ.' };
const errors: Partial<Record<LoginError, string>> = {
  network: 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
  timeout: 'Kết nối quá thời gian chờ. Bạn có thể thử lại.',
  'rate-limited': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
};
const serviceError = 'Chưa thể yêu cầu đặt lại mật khẩu. Vui lòng thử lại.';

export function ForgotPasswordScreen({ initialEmail = '', onBack, onRequestReset, recoveryActions }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [acceptedEmail, setAcceptedEmail] = useState<string>();
  const [fieldError, setFieldError] = useState<LoginFieldErrors['email']>();
  const [error, setError] = useState<LoginError>();
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  const { panelStyle, fieldsStyle } = useAuthMotion('login');

  const back = useCallback(() => {
    request.current?.abort();
    request.current = null;
    Keyboard.dismiss();
    onBack();
  }, [onBack]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => { listener.remove(); request.current?.abort(); };
  }, [back]);

  async function submit() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setFieldError(undefined);
    setError(undefined);
    Keyboard.dismiss();
    try {
      const result = await onRequestReset(email, controller.signal);
      if (controller.signal.aborted) return;
      if (result.kind === 'accepted') setAcceptedEmail(result.email);
      else if (result.kind === 'invalid') setFieldError(result.fields.email);
      else if (result.kind === 'error') setError(result.error);
    } catch {
      if (!controller.signal.aborted) setError('service');
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.form}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={back} style={styles.backButton}>
              <Image source={require('../../../../assets/login/back.png')} accessible={false} style={styles.icon} />
            </Pressable>
            <Animated.View style={[styles.panel, panelStyle]}>
              <Image source={require('../../../../assets/agrivision-leaf-mark.png')} accessible={false} resizeMode="contain" style={styles.mark} />
              {!(acceptedEmail && recoveryActions) && <Text accessibilityRole="header" style={styles.title}>{acceptedEmail ? 'Kiểm tra email' : 'Quên mật khẩu'}</Text>}
              {acceptedEmail && recoveryActions ? (
                <PasswordRecoverySteps email={acceptedEmail} actions={recoveryActions} requestRef={request}
                  onResend={onRequestReset} onChangeEmail={() => {setEmail(acceptedEmail);setAcceptedEmail(undefined);}} />
              ) : acceptedEmail ? (
                <View style={styles.fields}>
                  <Text accessibilityLiveRegion="polite" style={styles.body}>{'Nếu email khớp với tài khoản hợp lệ, bạn sẽ nhận được mã đặt lại mật khẩu. Kiểm tra cả thư rác.'}</Text>
                  <Text selectable style={styles.email}>{acceptedEmail}</Text>
                  <ActionButton label="Thay đổi email" variant="secondary" onPress={() => { setEmail(acceptedEmail); setAcceptedEmail(undefined); }} />
                </View>
              ) : (
                <Animated.View style={[styles.fields, fieldsStyle]}>
                  <Text style={styles.body}>{'Nhập email bạn đã dùng để đăng ký AgriAI.'}</Text>
                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      accessibilityLabel="Email"
                      accessibilityHint={fieldError ? fieldErrors[fieldError] : 'Nhập email bạn dùng để đăng nhập.'}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      autoCorrect={false}
                      editable={!pending}
                      placeholder="ban@example.com"
                      placeholderTextColor={theme.colors.textMuted}
                      returnKeyType="send"
                      value={email}
                      onChangeText={(value) => { setEmail(value); setFieldError(undefined); setError(undefined); }}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      onSubmitEditing={() => void submit()}
                      style={[styles.input, focused && styles.focused, pending && styles.disabledInput, Boolean(fieldError) && styles.invalid]}
                    />
                    <Text accessibilityRole={fieldError ? 'alert' : undefined} accessibilityLiveRegion="polite" style={fieldError ? styles.error : styles.helper}>
                      {fieldError ? fieldErrors[fieldError] : 'Nhập email bạn dùng để đăng nhập.'}
                    </Text>
                  </View>
                  {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors[error] ?? serviceError}</Text>}
                  <ActionButton label="Gửi mã" busy={pending} onPress={() => void submit()} />
                </Animated.View>
              )}
              <ActionButton label="Quay lại đăng nhập" variant="secondary" onPress={back} />
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { flexGrow: 1, padding: theme.spacing.gutter },
  form: { width: '100%', maxWidth: theme.login.formMaxWidth, alignSelf: 'center', gap: theme.spacing.sm },
  panel: { gap: theme.spacing.md, padding: theme.spacing.gutter, backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.card },
  backButton: { width: theme.layout.touchMin, height: theme.layout.touchMin, alignItems: 'center', justifyContent: 'center' },
  icon: { width: theme.login.iconSize, height: theme.login.iconSize },
  mark: { width: theme.layout.touchMin, height: theme.layout.touchMin },
  title: { ...theme.login.header, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.textMuted },
  email: { ...theme.typography.bodyStrong, color: theme.colors.text },
  fields: { gap: theme.spacing.md },
  field: { gap: theme.spacing.sm },
  label: { ...theme.typography.label, color: theme.colors.text },
  input: { ...theme.typography.body, color: theme.colors.text, backgroundColor: theme.colors.surface,
    minHeight: theme.login.fieldMinHeight, padding: theme.spacing.control, borderWidth: 1,
    borderColor: theme.colors.textMuted, borderRadius: theme.radius.input },
  focused: { borderColor: theme.colors.focus, borderWidth: 2 },
  disabledInput: { backgroundColor: theme.colors.surfaceMuted },
  invalid: { borderColor: theme.colors.error },
  helper: { ...theme.login.caption, color: theme.colors.textMuted },
  error: { ...theme.login.caption, color: theme.colors.error },
});
