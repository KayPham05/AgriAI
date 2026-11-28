import { useState, type RefObject } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/ui/ActionButton';
import {
  loginOtpLength, type OtpError, type ResendLoginOtpResult, type VerifyLoginOtpResult,
} from '@/features/auth/submitLogin';
import { theme } from '@/theme/tokens';

export type LoginOtpActions = {
  verify: (challengeId: string, code: string, signal: AbortSignal) => Promise<VerifyLoginOtpResult>;
  resend: (challengeId: string, signal: AbortSignal) => Promise<ResendLoginOtpResult>;
};

type Props = {
  initialChallengeId: string;
  actions: LoginOtpActions;
  requestRef: RefObject<AbortController | null>;
  onVerified: (result: Extract<VerifyLoginOtpResult, { kind: 'authenticated' }>) => void;
};

const help = 'Có thể dán hoặc tự điền mã từ thiết bị.';
const invalidCode = 'Mã không hợp lệ hoặc đã hết hạn.';
const errors: Partial<Record<OtpError, string>> = {
  'invalid-code': invalidCode,
  'resend-rejected': 'Chưa thể gửi lại mã. Hãy thử lại sau hoặc quay lại đăng nhập.',
  'login-locked': 'T\u00e0i kho\u1ea3n t\u1ea1m kh\u00f3a. H\u00e3y quay l\u1ea1i \u0111\u0103ng nh\u1eadp \u0111\u1ec3 ki\u1ec3m tra th\u1eddi gian ch\u1edd.',
  'rate-limited': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
  'unsupported-account': 'Tài khoản này không hỗ trợ đăng nhập trên ứng dụng.',
  storage: 'Không thể lưu phiên. Hãy quay lại đăng nhập để nhận mã mới.',
  network: 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
  timeout: 'Kết nối quá thời gian chờ. Vui lòng thử lại.',
};

export function LoginOtpForm({ initialChallengeId, actions, requestRef, onVerified }: Props) {
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [pending, setPending] = useState<'verify' | 'resend'>();
  const [error, setError] = useState<OtpError>();
  const [sent, setSent] = useState(false);
  const [restartRequired, setRestartRequired] = useState(false);
  const invalid = error === 'invalid-code';

  async function run(action: 'verify' | 'resend') {
    if (requestRef.current || restartRequired || (action === 'verify' && code.length !== loginOtpLength)) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPending(action);
    setError(undefined);
    setSent(false);
    Keyboard.dismiss();
    try {
      const result = await (action === 'verify'
        ? actions.verify(challengeId, code, controller.signal)
        : actions.resend(challengeId, controller.signal));
      if (controller.signal.aborted) return;
      if (result.kind === 'error') {
        setError(result.error);
        if (result.error === 'storage' || result.error === 'unsupported-account') setRestartRequired(true);
      } else if (result.kind === 'resent') {
        setChallengeId(result.challengeId);
        setCode('');
        setSent(true);
      } else if (result.kind === 'authenticated') {
        setCode('');
        onVerified(result);
      }
    } catch {
      if (!controller.signal.aborted) setError('service');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setPending(undefined);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.description}>Nhập mã 8 số đã gửi đến email của bạn để đăng nhập.</Text>
      <View style={styles.field}>
        <Text style={styles.label}>Mã xác minh 8 số</Text>
        <TextInput
          accessibilityLabel="Mã xác minh 8 số"
          accessibilityHint={invalid ? invalidCode : help}
          autoComplete="one-time-code"
          keyboardType="number-pad"
          returnKeyType="done"
          placeholder="Nhập mã 8 số"
          placeholderTextColor={theme.colors.textMuted}
          editable={!pending && !restartRequired}
          value={code}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={(value) => {
            setCode(value.replace(/[^0-9]/g, '').slice(0, loginOtpLength));
            if (invalid) setError(undefined);
          }}
          onSubmitEditing={() => void run('verify')}
          style={[styles.input, focused && styles.focused, invalid && styles.invalid]}
        />
        <Text accessibilityLiveRegion="polite" style={invalid ? styles.error : styles.caption}>
          {invalid ? invalidCode : help}
        </Text>
      </View>
      {error && !invalid && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {errors[error] ?? 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.'}
        </Text>
      )}
      {sent && <Text accessibilityLiveRegion="polite" style={styles.sent}>Đã gửi mã mới đến email của bạn.</Text>}
      <ActionButton
        label="Xác minh mã"
        busy={pending === 'verify'}
        onPress={!pending && !restartRequired && code.length === loginOtpLength ? () => void run('verify') : undefined}
      />
      <ActionButton
        label="Gửi lại mã"
        variant="secondary"
        busy={pending === 'resend'}
        onPress={!pending && !restartRequired ? () => void run('resend') : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing.md },
  description: { ...theme.typography.body, color: theme.colors.textMuted },
  field: { gap: theme.spacing.sm },
  label: { ...theme.typography.label, color: theme.colors.text },
  input: {
    ...theme.typography.subtitle,
    minHeight: theme.login.fieldMinHeight,
    paddingHorizontal: theme.spacing.control,
    paddingVertical: theme.spacing.control,
    borderWidth: 1,
    borderRadius: theme.radius.input,
    borderColor: theme.colors.textMuted,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  focused: { borderColor: theme.colors.primary },
  invalid: { borderColor: theme.colors.error },
  caption: { ...theme.login.caption, color: theme.colors.textMuted },
  error: { ...theme.login.caption, color: theme.colors.error },
  sent: { ...theme.login.caption, color: theme.colors.primary },
});
