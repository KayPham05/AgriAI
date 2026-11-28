import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Animated, BackHandler, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActionButton } from '@/components/ui/ActionButton';
import type { PasswordRecoveryActions } from '@/features/auth/screens/PasswordRecoverySteps';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { RegistrationConsent } from '@/features/auth/screens/RegistrationConsent';
import { LoginOtpForm, type LoginOtpActions } from '@/features/auth/screens/LoginOtpForm';
import { useAuthMotion } from '@/features/auth/screens/useAuthMotion';
import type {
  LoginCredentials, LoginError, LoginFieldErrors, LoginResult, PasswordResetRequestResult, RegistrationCredentials,
} from '@/features/auth/submitLogin';
import { theme } from '@/theme/tokens';

const errorText: Record<LoginError, string> = {
  credentials: 'Email hoặc mật khẩu không đúng, hoặc tài khoản không còn hoạt động.',
  'login-locked': 'Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần.',
  'rate-limited': 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.',
  service: 'Chưa thể đăng nhập. Vui lòng thử lại sau.',
  'unsupported-account': 'Tài khoản này không hỗ trợ đăng nhập trên ứng dụng.',
  network: 'Không kết nối được. Hãy kiểm tra mạng rồi thử lại.',
  timeout: 'Kết nối quá thời gian chờ. Bạn có thể thử lại.',
  storage: 'Không thể lưu phiên trên thiết bị. Vui lòng thử lại.',
  'registration-rejected': 'Không thể tạo tài khoản với thông tin này. Kiểm tra lại hoặc thử email khác.',
};
const nameMessages = { required: 'Vui lòng nhập họ và tên.', 'too-long': 'Họ và tên tối đa 100 ký tự.' };
const emailMessages = { required: 'Vui lòng nhập email.', format: 'Nhập địa chỉ email hợp lệ.' };
const passwordMessages = {
  required: 'Vui lòng nhập mật khẩu.',
  'too-short': 'Mật khẩu cần ít nhất 6 ký tự.',
  'too-long': 'Mật khẩu không được vượt quá 72 byte UTF-8.',
};
const modes = [{ id: 'login', label: 'Đăng nhập' }, { id: 'register', label: 'Đăng ký' }] as const;
type AuthMode = (typeof modes)[number]['id'];

type Completion = Extract<LoginResult, { kind: 'authenticated' | 'otp-required' }>;

const captchaCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function createCaptchaCode() {
  return Array.from({ length: 5 }, () => captchaCharacters[Math.floor(Math.random() * captchaCharacters.length)]).join('');
}

type Props = {
  onBack: () => void;
  recoveryActions?: PasswordRecoveryActions;
  onRequestPasswordReset?: (email: string, signal: AbortSignal) => Promise<PasswordResetRequestResult>;
  onSubmit: (credentials: LoginCredentials, signal: AbortSignal) => Promise<LoginResult>;
  onRegister?: (credentials: RegistrationCredentials, signal: AbortSignal) => Promise<LoginResult>;
  onAuthenticated?: (session: Extract<LoginResult, { kind: 'authenticated' }>) => void;
  onOtpRequired?: (challengeId: string) => void;
  otp?: LoginOtpActions;
};

export function LoginScreen({ onBack, onSubmit, onRegister, onAuthenticated, onOtpRequired, onRequestPasswordReset, recoveryActions, otp }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [recovering, setRecovering] = useState(false);
  const closeRecovery = useCallback(() => setRecovering(false), []);
  const { panelStyle, fieldsStyle } = useAuthMotion(mode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [registrationErrors, setRegistrationErrors] = useState<{ confirmPassword?: string; terms?: string }>({});
  const [captchaCode, setCaptchaCode] = useState(createCaptchaCode);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [visible, setVisible] = useState(false);
  const [focus, setFocus] = useState<keyof LoginFieldErrors | 'captcha' | 'confirmPassword' | null>(null);
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<LoginFieldErrors>({});
  const [error, setError] = useState<LoginError>();
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number>();
  const [completion, setCompletion] = useState<Completion>();
  const request = useRef<AbortController | null>(null);
  const emailInput = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmPasswordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const captchaInput = useRef<ComponentRef<typeof TextInput>>(null);
  const registering = mode === 'register';
  const showingOtp = completion?.kind === 'otp-required' && Boolean(otp);

  useEffect(() => () => request.current?.abort(), []);

  const cancelOtp = useCallback(() => {
    request.current?.abort();
    request.current = null;
    Keyboard.dismiss();
    setCompletion(undefined);
    setCaptchaCode(createCaptchaCode());
    setCaptchaAnswer('');
    setCaptchaError(false);
  }, []);

  useEffect(() => {
    if (!showingOtp) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelOtp();
      return true;
    });
    return () => subscription.remove();
  }, [cancelOtp, showingOtp]);

  function finishAuthentication(result: Extract<LoginResult, { kind: 'authenticated' }>) {
    if (onAuthenticated) onAuthenticated(result);
    else setCompletion(result);
  }

  async function submit() {
    if (request.current) return;
    if (registering) {
      const nextErrors = {
        confirmPassword: !confirmPassword ? 'Vui lòng nhập lại mật khẩu.'
          : confirmPassword !== password ? 'Mật khẩu nhập lại không khớp.' : undefined,
        terms: !termsRead || !acceptedTerms ? 'Bạn cần đồng ý với điều khoản để tạo tài khoản.' : undefined,
      };
      setRegistrationErrors(nextErrors);
      if (nextErrors.confirmPassword || nextErrors.terms) {
        if (nextErrors.confirmPassword) confirmPasswordInput.current?.focus();
        return;
      }
    }
    if (!registering && captchaAnswer.trim().toUpperCase() !== captchaCode) {
      setCaptchaError(true);
      captchaInput.current?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    Keyboard.dismiss();
    setPending(true);
    setFields({});
    setError(undefined);
    try {
      const result = await (registering && onRegister
        ? onRegister({ fullName, email, password }, controller.signal)
        : onSubmit({ email, password }, controller.signal));
      if (controller.signal.aborted) return;
      switch (result.kind) {
        case 'invalid': setFields(result.fields); break;
        case 'error':
          setError(result.error);
          setRetryAfterSeconds(result.retryAfterSeconds);
          if (!registering) refreshCaptcha();
          break;
        case 'authenticated':
          setPassword('');
          setConfirmPassword('');
          setConfirmVisible(false);
          setVisible(false);
          finishAuthentication(result);
          break;
        case 'otp-required':
          setPassword('');
          setConfirmPassword('');
          setConfirmVisible(false);
          setVisible(false);
          if (onOtpRequired) onOtpRequired(result.challengeId);
          else setCompletion(result);
          break;
        case 'cancelled': break;
      }
    } catch {
      if (!controller.signal.aborted) {
        setError('service');
        if (!registering) refreshCaptcha();
      }
    } finally {
      if (request.current === controller) request.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  function back() {
    if (showingOtp) {
      cancelOtp();
      return;
    }
    request.current?.abort();
    onBack();
  }

  function switchMode(next: AuthMode) {
    if (next === mode || request.current) return;
    Keyboard.dismiss();
    setMode(next);
    setConfirmPassword('');
    setConfirmVisible(false);
    setAcceptedTerms(false);
    setTermsRead(false);
    setRegistrationErrors({});
    setPassword('');
    setVisible(false);
    setFields({});
    setFocus(null);
    setError(undefined);
    refreshCaptcha();
  }

  function refreshCaptcha() {
    setCaptchaCode(createCaptchaCode());
    setCaptchaAnswer('');
    setCaptchaError(false);
  }

  if (recovering && onRequestPasswordReset) {
    return <ForgotPasswordScreen initialEmail={email} onBack={closeRecovery} onRequestReset={onRequestPasswordReset} recoveryActions={recoveryActions} />;
  }

  const formTitle = registering ? 'Tạo tài khoản AgriAI' : 'Chào mừng bạn trở lại';
  let title = formTitle;
  if (completion?.kind === 'otp-required') title = 'Xác minh đăng nhập';
  if (completion?.kind === 'authenticated') title = registering ? 'Đã tạo tài khoản' : 'Đã đăng nhập';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={back} style={styles.backButton}>
              <Image source={require('../../../../assets/login/back.png')} accessible={false} style={styles.icon} />
            </Pressable>
            <Animated.View style={[styles.panel, panelStyle]}>
              <View style={styles.header}>
                <Image source={require('../../../../assets/agrivision-leaf-mark.png')} accessible={false} resizeMode="contain" style={styles.mark} />
                <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
                {!completion && (
                  <Text style={styles.message}>
                    {registering ? 'Lưu kết quả phân loại để tiện đối chiếu về sau.' : 'Đăng nhập để xem lại các mẫu lá đã lưu.'}
                  </Text>
                )}
              </View>
              {completion?.kind === 'otp-required' && otp ? (
                <LoginOtpForm
                  initialChallengeId={completion.challengeId}
                  actions={otp}
                  requestRef={request}
                  onVerified={finishAuthentication}
                />
              ) : completion ? (
                <Text accessibilityLiveRegion="polite" style={styles.message}>
                  {completion.kind === 'otp-required'
                    ? 'Tài khoản cần mã xác minh. Bước nhập mã chưa khả dụng trên bản này.'
                    : `Chào ${completion.fullName}. Phiên đã được lưu trên thiết bị.`}
                </Text>
              ) : (
                <>
                  {onRegister && (
                    <View accessibilityRole="tablist" style={styles.tabs}>
                      {modes.map(({ id, label }) => (
                        <Pressable
                          key={id}
                          accessibilityRole="tab"
                          accessibilityLabel={label}
                          accessibilityState={{ selected: mode === id, disabled: pending }}
                          disabled={pending}
                          style={[styles.tab, mode === id && styles.selectedTab]}
                          onPress={() => switchMode(id)}
                        >
                          <Text style={[styles.tabLabel, mode === id && styles.selectedTabLabel]}>{label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <Animated.View style={[styles.fields, fieldsStyle]}>
                    {registering && (
                      <View style={styles.field}>
                        <Text style={styles.label}>Họ và tên</Text>
                        <View style={[styles.outline, focus === 'fullName' && styles.focused, fields.fullName && styles.invalid]}>
                          <TextInput
                            accessibilityLabel="Họ và tên"
                            accessibilityHint={fields.fullName ? nameMessages[fields.fullName] : undefined}
                            autoComplete="name"
                            autoCapitalize="words"
                            editable={!pending}
                            returnKeyType="next"
                            submitBehavior="submit"
                            value={fullName}
                            onChangeText={(value) => { setFullName(value); setFields((current) => ({ ...current, fullName: undefined })); setError(undefined); }}
                            onFocus={() => setFocus('fullName')}
                            onBlur={() => setFocus(null)}
                            onSubmitEditing={() => emailInput.current?.focus()}
                            style={styles.input}
                          />
                        </View>
                        {fields.fullName && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{nameMessages[fields.fullName]}</Text>}
                      </View>
                    )}
                    <View style={styles.field}>
                      <Text style={styles.label}>Email</Text>
                      <View style={[styles.outline, focus === 'email' && styles.focused, fields.email && styles.invalid]}>
                        <TextInput
                          ref={emailInput}
                          accessibilityLabel="Email"
                          accessibilityHint={fields.email ? emailMessages[fields.email] : undefined}
                          autoCapitalize="none"
                          autoComplete={registering ? 'email' : 'username'}
                          autoCorrect={false}
                          editable={!pending}
                          keyboardType="email-address"
                          placeholder="ban@example.com"
                          placeholderTextColor={theme.colors.textMuted}
                          returnKeyType="next"
                          submitBehavior="submit"
                          value={email}
                          onChangeText={(value) => { setEmail(value); setFields((current) => ({ ...current, email: undefined })); setError(undefined); }}
                          onFocus={() => setFocus('email')}
                          onBlur={() => setFocus(null)}
                          onSubmitEditing={() => passwordInput.current?.focus()}
                          style={styles.input}
                        />
                      </View>
                      {fields.email && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{emailMessages[fields.email]}</Text>}
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>Mật khẩu</Text>
                      <View style={[styles.outline, focus === 'password' && styles.focused, fields.password && styles.invalid]}>
                        <TextInput
                          ref={passwordInput}
                          accessibilityLabel="Mật khẩu"
                          accessibilityHint={fields.password ? passwordMessages[fields.password] : undefined}
                          autoCapitalize="none"
                          autoComplete={registering ? 'new-password' : 'current-password'}
                          autoCorrect={false}
                          editable={!pending}
                          placeholder={registering ? 'Tối thiểu 6 ký tự' : undefined}
                          placeholderTextColor={theme.colors.textMuted}
                          secureTextEntry={!visible}
                          returnKeyType="next"
                          submitBehavior="submit"
                          value={password}
                          onChangeText={(value) => { setPassword(value); setRegistrationErrors((current) => ({ ...current, confirmPassword: undefined })); setFields((current) => ({ ...current, password: undefined })); setError(undefined); }}
                          onFocus={() => setFocus('password')}
                          onBlur={() => setFocus(null)}
                          onSubmitEditing={() => registering ? confirmPasswordInput.current?.focus() : captchaInput.current?.focus()}
                          style={styles.input}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          accessibilityState={{ disabled: pending }}
                          disabled={pending}
                          onPress={() => setVisible(!visible)}
                          style={styles.iconButton}
                        >
                          <Image source={require('../../../../assets/login/eye.png')} accessible={false} style={styles.icon} />
                        </Pressable>
                      </View>
                      {fields.password && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{passwordMessages[fields.password]}</Text>}
                    </View>
                    {registering && (
                      <>
                        <View style={styles.field}>
                          <Text style={styles.label}>{'Nhập lại mật khẩu'}</Text>
                          <View style={[styles.outline, focus === 'confirmPassword' && styles.focused, Boolean(registrationErrors.confirmPassword) && styles.invalid]}>
                            <TextInput
                              ref={confirmPasswordInput}
                              accessibilityLabel="Nhập lại mật khẩu"
                              accessibilityHint={registrationErrors.confirmPassword}
                              autoCapitalize="none"
                              autoComplete="new-password"
                              autoCorrect={false}
                              editable={!pending}
                              secureTextEntry={!confirmVisible}
                              returnKeyType="go"
                              value={confirmPassword}
                              onChangeText={(value) => {
                                setConfirmPassword(value);
                                setRegistrationErrors((current) => ({ ...current, confirmPassword: undefined }));
                              }}
                              onFocus={() => setFocus('confirmPassword')}
                              onBlur={() => setFocus(null)}
                              onSubmitEditing={() => void submit()}
                              style={styles.input}
                            />
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={confirmVisible ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
                              accessibilityState={{ disabled: pending }}
                              disabled={pending}
                              onPress={() => setConfirmVisible(!confirmVisible)}
                              style={styles.iconButton}
                            >
                              <Image source={require('../../../../assets/login/eye.png')} accessible={false} style={styles.icon} />
                            </Pressable>
                          </View>
                          {registrationErrors.confirmPassword && <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{registrationErrors.confirmPassword}</Text>}
                        </View>
                        <RegistrationConsent
                          checked={acceptedTerms}
                          onReadComplete={() => { setTermsRead(true); setAcceptedTerms(false); }}
                          disabled={pending}
                          error={registrationErrors.terms}
                          onChange={(checked) => {
                            setAcceptedTerms(checked);
                            setRegistrationErrors((current) => ({ ...current, terms: undefined }));
                          }}
                        />
                      </>
                    )}
                    {!registering && onRequestPasswordReset && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Quên mật khẩu"
                        disabled={pending}
                        accessibilityState={{ disabled: pending }}
                        onPress={() => { setPassword(''); setVisible(false); setRecovering(true); }}
                        style={styles.recoveryButton}
                      >
                        <Text style={styles.recoveryLabel}>{'Quên mật khẩu?'}</Text>
                      </Pressable>
                    )}
                    {!registering && (
                      <View style={styles.field}>
                        <Text style={styles.label}>Mã xác nhận</Text>
                        <View style={styles.captchaRow}>
                          <View style={styles.captchaChallenge}>
                            <Text accessibilityLabel={`Mã CAPTCHA: ${captchaCode}`} style={styles.captchaCode}>
                              {captchaCode}
                            </Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Tạo mã CAPTCHA mới"
                              accessibilityState={{ disabled: pending }}
                              disabled={pending}
                              onPress={refreshCaptcha}
                              style={({ pressed }) => [styles.captchaRefresh, pressed && styles.captchaPressed]}
                            >
                              <Text accessible={false} style={styles.captchaRefreshIcon}>{'↻'}</Text>
                            </Pressable>
                          </View>
                          <TextInput
                            ref={captchaInput}
                            accessibilityLabel="Mã xác nhận"
                            accessibilityHint={captchaError ? 'Mã CAPTCHA chưa chính xác.' : 'Nhập mã 5 ký tự đang hiển thị.'}
                            autoCapitalize="characters"
                            autoComplete="off"
                            autoCorrect={false}
                            spellCheck={false}
                            maxLength={5}
                            returnKeyType="go"
                            value={captchaAnswer}
                            editable={!pending}
                            placeholder="Nhập mã"
                            onFocus={() => setFocus('captcha')}
                            onBlur={() => setFocus(null)}
                            placeholderTextColor={theme.colors.textMuted}
                            onChangeText={(value) => { setCaptchaAnswer(value.toUpperCase()); setCaptchaError(false); }}
                            onSubmitEditing={() => void submit()}
                            style={[styles.captchaInput, focus === 'captcha' && styles.focused, captchaError && styles.invalid]}
                          />
                        </View>
                        {captchaError && (
                          <Text accessibilityLiveRegion="polite" style={styles.fieldError}>Mã CAPTCHA chưa chính xác.</Text>
                        )}
                      </View>
                    )}
                    {error && (
                      <View accessibilityLiveRegion="polite" style={styles.notice}>
                        <Image source={require('../../../../assets/login/error.png')} accessible={false} style={styles.icon} />
                        <Text style={styles.noticeText}>{registering && error === 'service'
                          ? 'Chưa thể tạo tài khoản. Vui lòng thử lại sau.'
                          : errorText[error]}{error === 'login-locked' && retryAfterSeconds
                            ? ` Thử lại sau ${Math.ceil(retryAfterSeconds / 60)} phút.` : ''}</Text>
                      </View>
                    )}
                    <ActionButton label={registering ? 'Tạo tài khoản' : 'Đăng nhập'} onPress={() => void submit()} busy={pending} />
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { flexGrow: 1, padding: theme.spacing.gutter },
  form: { width: '100%', maxWidth: theme.login.formMaxWidth, alignSelf: 'center', gap: theme.spacing.sm },
  panel: {
    gap: theme.spacing.md, padding: theme.spacing.gutter,
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: theme.radius.card,
  },
  header: { gap: theme.spacing.sm },
  mark: { width: theme.layout.touchMin, height: theme.layout.touchMin },
  heading: { ...theme.login.header, color: theme.colors.text },
  message: { ...theme.typography.body, color: theme.colors.textMuted },
  tabs: {
    flexDirection: 'row', padding: theme.spacing.xs, gap: theme.spacing.xs,
    borderRadius: theme.radius.input, backgroundColor: theme.colors.surfaceMuted,
  },
  tab: {
    flex: 1, minHeight: theme.layout.touchMin, justifyContent: 'center', alignItems: 'center',
    padding: theme.spacing.sm, borderRadius: theme.radius.input,
  },
  selectedTab: { backgroundColor: theme.colors.surface },
  tabLabel: { ...theme.typography.label, color: theme.colors.textMuted, textAlign: 'center' },
  selectedTabLabel: { color: theme.colors.primary },
  fields: { gap: theme.spacing.md },
  field: { gap: theme.spacing.sm },
  label: { ...theme.typography.label, color: theme.colors.text },
  outline: {
    flexDirection: 'row', alignItems: 'center', paddingEnd: theme.spacing.xs,
    minHeight: theme.login.fieldMinHeight, backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.input, borderWidth: 1, borderColor: theme.colors.textMuted,
  },
  focused: { borderColor: theme.colors.primary },
  invalid: { borderColor: theme.colors.error },
  input: {
    ...theme.typography.body, color: theme.colors.text, flex: 1,
    paddingStart: theme.spacing.control, paddingEnd: theme.spacing.xs, paddingVertical: theme.spacing.control,
  },
  iconButton: {
    width: theme.layout.touchMin, height: theme.layout.touchMin,
    alignItems: 'center', justifyContent: 'center',
  },
  backButton: {
    width: theme.layout.touchMin, height: theme.layout.touchMin, alignSelf: 'flex-start',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { width: theme.login.iconSize, height: theme.login.iconSize, flexShrink: 0 },
  fieldError: { ...theme.login.caption, color: theme.colors.error },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.control, padding: theme.spacing.control,
    borderRadius: theme.radius.input, borderWidth: 1, borderColor: theme.colors.error,
    backgroundColor: theme.colors.surfaceMuted,
  },
  noticeText: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  recoveryButton: { minHeight: theme.layout.touchMin, justifyContent: 'center', alignSelf: 'flex-end' },
  recoveryLabel: { ...theme.typography.label, color: theme.colors.primary, textDecorationLine: 'underline' },
  captchaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.control },
  captchaChallenge: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.input,
    paddingStart: theme.spacing.control, backgroundColor: theme.colors.secondary,
  },
  captchaCode: { ...theme.typography.subtitle, letterSpacing: theme.login.captchaLetterSpacing, color: theme.colors.primary },
  captchaRefresh: { minWidth: theme.layout.touchMin, minHeight: theme.layout.touchMin, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.control },
  captchaRefreshIcon: { fontSize: theme.login.iconSize, color: theme.colors.primary },
  captchaPressed: { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.input },
  captchaInput: {
    ...theme.typography.body, color: theme.colors.text, flexGrow: 1,
    minWidth: theme.login.captchaInputMinWidth, minHeight: theme.login.fieldMinHeight,
    borderWidth: 1, borderColor: theme.colors.textMuted, borderRadius: theme.radius.input,
    backgroundColor: theme.colors.surface, padding: theme.spacing.control,
  },
});
