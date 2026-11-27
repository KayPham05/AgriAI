import { useEffect, useRef, useState, type RefObject, type ComponentRef } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import type { NewPasswordValues, PasswordResetRequestResult, RecoveryError, ResetPasswordResult, VerifyPasswordResetResult } from '@/features/auth/submitLogin';
import { theme } from '@/theme/tokens';
export type PasswordRecoveryActions = {
    verify: (code: string, signal: AbortSignal) => Promise<VerifyPasswordResetResult>;
    reset: (values: NewPasswordValues, signal: AbortSignal) => Promise<ResetPasswordResult>;
};
type Props = {
    email: string;
    actions: PasswordRecoveryActions;
    onResend: (email: string, signal: AbortSignal) => Promise<PasswordResetRequestResult>;
    onChangeEmail: () => void;
    requestRef: RefObject<AbortController | null>;
};
type Fields = Extract<ResetPasswordResult, {
    kind: 'invalid';
}>['fields'];
const invalidCode = 'Mã không hợp lệ hoặc đã hết hạn. Hãy kiểm tra lại hoặc yêu cầu mã mới.';
const errors: Partial<Record<RecoveryError, string>> = {
    'invalid-code': invalidCode,
    network: 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
    timeout: 'Kết nối quá thời gian chờ. Bạn có thể thử lại.',
    'rate-limited': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
};
const passwordErrors = { required: 'Vui lòng nhập mật khẩu mới.', 'too-short': 'Mật khẩu cần ít nhất 6 ký tự.', 'too-long': 'Mật khẩu không được vượt quá 72 byte UTF-8.' };
const confirmErrors = { required: 'Vui lòng nhập lại mật khẩu mới.', mismatch: 'Mật khẩu nhập lại không khớp.' };
export function PasswordRecoverySteps({ email, actions, onResend, onChangeEmail, requestRef }: Props) {
    const [step, setStep] = useState<'code' | 'password' | 'done'>('code');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [visible, setVisible] = useState({ password: false, confirmPassword: false });
    const [focused, setFocused] = useState<string>();
    const [fields, setFields] = useState<Fields>({});
    const [error, setError] = useState<RecoveryError>();
    const [resent, setResent] = useState(false);
    const [pending, setPending] = useState<'verify' | 'reset' | 'resend'>();
    const confirmation = useRef<ComponentRef<typeof TextInput>>(null);
    useEffect(() => () => requestRef.current?.abort(), [requestRef]);
    function clearPasswords() { setPassword(''); setConfirmPassword(''); setVisible({ password: false, confirmPassword: false }); }
    function returnToCode() { setStep('code'); clearPasswords(); setFields({}); setError(undefined); }
    async function run(action: 'verify' | 'reset' | 'resend') {
        if (requestRef.current || (action === 'verify' && code.length !== 8))
            return;
        const controller = new AbortController();
        requestRef.current = controller;
        setPending(action);
        setError(undefined);
        setFields({});
        setResent(false);
        Keyboard.dismiss();
        try {
            const result = await (action === 'verify' ? actions.verify(code, controller.signal)
                : action === 'reset' ? actions.reset({ code, password, confirmPassword }, controller.signal)
                    : onResend(email, controller.signal));
            if (controller.signal.aborted)
                return;
            if (result.kind === 'verified') {
                setStep('password');
                clearPasswords();
            }
            else if (result.kind === 'reset') {
                setCode('');
                clearPasswords();
                setStep('done');
            }
            else if (result.kind === 'accepted') {
                setCode('');
                setResent(true);
            }
            else if (result.kind === 'invalid') {
                if (action === 'reset') {
                    const next = result.fields as Fields;
                    if (next.code) {
                        returnToCode();
                        setError('invalid-code');
                    }
                    else
                        setFields(next);
                }
                else
                    setError('service');
            }
            else if (result.kind === 'error') {
                if (action === 'reset' && result.error === 'invalid-code')
                    returnToCode();
                setError(result.error);
            }
        }
        catch {
            if (!controller.signal.aborted)
                setError('service');
        }
        finally {
            if (requestRef.current === controller)
                requestRef.current = null;
            if (!controller.signal.aborted)
                setPending(undefined);
        }
    }
    return (<View style={styles.form}>
      <Text accessibilityRole="header" style={styles.heading}>{step === 'code' ? 'Kiểm tra email' : step === 'password' ? 'Đặt mật khẩu mới' : 'Đổi mật khẩu thành công'}</Text>
      {step === 'code' && <>
        <Text style={styles.body}>Nếu email khớp với tài khoản hợp lệ, bạn sẽ nhận được mã đặt lại mật khẩu. Kiểm tra cả thư rác.</Text>
        <Text style={styles.email} selectable>{email}</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Mã đặt lại mật khẩu</Text>
          <TextInput accessibilityLabel="Mã đặt lại mật khẩu" accessibilityHint={error === 'invalid-code' ? invalidCode : 'Nhập mã 8 số trong email.'} autoComplete="one-time-code" keyboardType="number-pad" returnKeyType="done" value={code} placeholder="Nhập mã 8 số" placeholderTextColor={theme.colors.textMuted} editable={!pending} onChangeText={value => { setCode(value.replace(/[^0-9]/g, '').slice(0, 8)); setError(undefined); }} onFocus={() => setFocused('code')} onBlur={() => setFocused(undefined)} onSubmitEditing={() => void run('verify')} style={[styles.input, styles.code, focused === 'code' && styles.focused, error === 'invalid-code' && styles.invalid]}/>
          <Text style={styles.helper}>Có thể dán hoặc tự điền mã từ thiết bị.</Text>
        </View>
        <ActionButton label="Xác minh mã" busy={pending === 'verify'} onPress={!pending && code.length === 8 ? () => void run('verify') : undefined}/>
        <ActionButton label="Gửi lại mã" variant="secondary" busy={pending === 'resend'} onPress={!pending ? () => void run('resend') : undefined}/>
        <ActionButton label="Thay đổi email" variant="secondary" onPress={!pending ? () => { setCode(''); clearPasswords(); onChangeEmail(); } : undefined}/>
        {resent && <Text accessibilityLiveRegion="polite" style={styles.body}>Yêu cầu gửi mã mới đã được tiếp nhận. Vui lòng kiểm tra email.</Text>}
      </>}
      {step === 'password' && <>
        <Text style={styles.body}>Tạo mật khẩu mới có ít nhất 6 ký tự.</Text>
        {(['password', 'confirmPassword'] as const).map(field => {
                const label = field === 'password' ? 'Mật khẩu mới' : 'Nhập lại mật khẩu mới';
                const message = field === 'password' ? (fields.password ? passwordErrors[fields.password] : undefined)
                    : (fields.confirmPassword ? confirmErrors[fields.confirmPassword] : undefined);
                return <View key={field} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.passwordRow, focused === field && styles.focused, Boolean(message) && styles.invalid]}>
              <TextInput ref={field === 'confirmPassword' ? confirmation : undefined} accessibilityLabel={label} accessibilityHint={message} autoComplete="new-password" autoCapitalize="none" autoCorrect={false} editable={!pending} secureTextEntry={!visible[field]} value={field === 'password' ? password : confirmPassword} returnKeyType={field === 'password' ? 'next' : 'go'} submitBehavior="submit" onChangeText={value => { if (field === 'password')
                    setPassword(value);
                else
                    setConfirmPassword(value); setFields(current => ({ ...current, [field]: undefined })); setError(undefined); }} onFocus={() => setFocused(field)} onBlur={() => setFocused(undefined)} onSubmitEditing={() => field === 'password' ? confirmation.current?.focus() : void run('reset')} style={styles.passwordInput}/>
              <Pressable accessibilityRole="button" accessibilityLabel={`${visible[field] ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`} accessibilityState={{ disabled: Boolean(pending) }} disabled={Boolean(pending)} style={styles.iconButton} onPress={() => setVisible(current => ({ ...current, [field]: !current[field] }))}>
                <Image source={require('../../../../assets/login/eye.png')} accessible={false} style={styles.icon}/>
              </Pressable>
            </View>
            {message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>}
          </View>;
            })}
        <ActionButton label="Đổi mật khẩu" busy={pending === 'reset'} onPress={!pending ? () => void run('reset') : undefined}/>
        <ActionButton label="Quay lại nhập mã" variant="secondary" onPress={!pending ? returnToCode : undefined}/>
      </>}
      {step === 'done' && <Text accessibilityLiveRegion="polite" style={styles.body}>Mật khẩu đã được cập nhật. Bạn có thể quay lại đăng nhập bằng mật khẩu mới.</Text>}
      {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{errors[error] ?? 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.'}</Text>}
    </View>);
}
const styles = StyleSheet.create({
    form: { gap: theme.spacing.md }, field: { gap: theme.spacing.sm },
    heading: { ...theme.login.header, color: theme.colors.text }, body: { ...theme.typography.body, color: theme.colors.textMuted },
    email: { ...theme.typography.bodyStrong, color: theme.colors.text }, label: { ...theme.typography.label, color: theme.colors.text },
    helper: { ...theme.login.caption, color: theme.colors.textMuted }, error: { ...theme.login.caption, color: theme.colors.error },
    input: { ...theme.typography.body, color: theme.colors.text, minHeight: theme.login.fieldMinHeight, borderWidth: 1, borderColor: theme.colors.textMuted, borderRadius: theme.radius.input, padding: theme.spacing.control, backgroundColor: theme.colors.surface },
    code: { ...theme.typography.subtitle }, focused: { borderColor: theme.colors.focus, borderWidth: 2 }, invalid: { borderColor: theme.colors.error },
    passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.textMuted, borderRadius: theme.radius.input, minHeight: theme.login.fieldMinHeight },
    passwordInput: { ...theme.typography.body, color: theme.colors.text, flex: 1, padding: theme.spacing.control },
    iconButton: { width: theme.layout.touchMin, height: theme.layout.touchMin, alignItems: 'center', justifyContent: 'center' },
    icon: { width: theme.login.iconSize, height: theme.login.iconSize },
});
