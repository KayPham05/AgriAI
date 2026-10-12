import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type AuthSession, login, register, saveAuthSession } from '../../services/authApi';

gsap.registerPlugin(useGSAP);

type AuthMode = 'login' | 'register';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (session: AuthSession) => void;
  initialMode?: AuthMode;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  captcha?: string;
  terms?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const captchaCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function createCaptchaCode(): string {
  return Array.from(
    { length: 5 },
    () => captchaCharacters[Math.floor(Math.random() * captchaCharacters.length)],
  ).join('');
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [captchaCode, setCaptchaCode] = useState('LEAF7');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousMode = useRef(mode);

  useGSAP(
    () => {
      const changed = previousMode.current !== mode;
      previousMode.current = mode;
      const root = panelRef.current;
      if (!changed || !root || typeof window.matchMedia !== 'function') return;
      const tokens = getComputedStyle(root);
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const opacity = parseFloat(tokens.getPropertyValue('--selection-enter-opacity'));
      if (![duration, distance, opacity].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add(
        {
          desktop: '(min-width: 768px)',
          mobile: '(max-width: 767px)',
          motion: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          if (!context.conditions?.motion || context.conditions.reduced) return;
          const formPanel = root.querySelector('[data-auth-form-panel]');
          const sidePanel = root.querySelector('[data-auth-side-panel]');
          const registering = mode === 'register';
          if (context.conditions.desktop) {
            gsap
              .timeline({ defaults: { duration, ease: 'power3.inOut' } })
              .fromTo(
                formPanel,
                { x: 0, xPercent: registering ? 0 : 100 },
                { xPercent: registering ? 100 : 0, clearProps: 'transform' },
              )
              .fromTo(
                sidePanel,
                { x: 0, xPercent: registering ? 100 : 0 },
                { xPercent: registering ? 0 : 100, clearProps: 'transform' },
                '<',
              );
          }
          gsap.fromTo(
            root.querySelector('[data-auth-fields]'),
            { opacity, y: distance },
            { opacity: 1, y: 0, duration, ease: 'power3.out', clearProps: 'opacity,transform' },
          );
        },
      );
      return () => media.revert();
    },
    { scope: panelRef, dependencies: [mode, isOpen], revertOnUpdate: true },
  );

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setCaptchaCode(createCaptchaCode());
      setCaptchaAnswer('');
      setHasAcceptedTerms(false);
      setErrors({});
      setServerError('');
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setCaptchaAnswer('');
    setHasAcceptedTerms(false);
    if (nextMode === 'login') setCaptchaCode(createCaptchaCode());
    setErrors({});
    setServerError('');
  };

  const refreshCaptcha = () => {
    setCaptchaCode(createCaptchaCode());
    setCaptchaAnswer('');
    setErrors((current) => ({ ...current, captcha: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (mode === 'register' && fullName.trim().length < 2) {
      nextErrors.fullName = 'Vui lòng nhập họ tên từ 2 ký tự.';
    }
    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Email chưa đúng định dạng.';
    }
    if (password.length < 6) {
      nextErrors.password = 'Mật khẩu cần ít nhất 6 ký tự.';
    }
    if (mode === 'login' && captchaAnswer.trim().toUpperCase() !== captchaCode) {
      nextErrors.captcha = 'Mã CAPTCHA chưa chính xác.';
    }
    if (mode === 'register' && !hasAcceptedTerms) {
      nextErrors.terms = 'Bạn cần đồng ý với điều khoản để tạo tài khoản.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const credentials = { email: email.trim().toLowerCase(), password };
      const session =
        mode === 'register'
          ? await register({ ...credentials, fullName: fullName.trim() })
          : await login(credentials);
      saveAuthSession(session, remember);
      onAuthSuccess(session);
      onClose();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      );
      if (mode === 'login') refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent
        className="block max-h-(--auth-dialog-max-height) overflow-y-auto p-0 sm:max-w-lg md:max-w-4xl"
        showCloseButton={!isSubmitting}
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
      >
        <div ref={panelRef} data-auth-mode={mode} className="relative min-w-0">
          <aside
            data-auth-side-panel
            className="auth-side-panel absolute inset-y-0 left-0 hidden w-1/2 flex-col items-center justify-center gap-5 bg-secondary px-8 py-12 text-center md:flex"
          >
            <p className="text-3xl font-semibold tracking-tight text-primary">
              {mode === 'login' ? 'Chào bạn đến AgriAI' : 'Bạn đã có tài khoản?'}
            </p>
            <p className="max-w-xs leading-7 text-muted-foreground">
              {mode === 'login'
                ? 'Tạo tài khoản để lưu và xem lại những mẫu lá đã kiểm tra.'
                : 'Đăng nhập để tiếp tục với những mẫu lá bạn đã lưu.'}
            </p>
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Tạo tài khoản' : 'Đăng nhập'}
            </Button>
          </aside>
          <div
            data-auth-form-panel
            className="auth-form-panel relative min-w-0 space-y-5 bg-surface p-6 sm:p-8 md:w-1/2"
          >
            <DialogHeader>
              <img
                src="/images/logo.png"
                alt="Logo AgriAI"
                width={40}
                height={40}
                className="mb-2 size-10 object-contain"
              />
              <DialogTitle className="text-2xl font-semibold">
                {mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản AgriAI'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'login'
                  ? 'Đăng nhập để xem lại các mẫu lá đã lưu.'
                  : 'Lưu kết quả phân loại để tiện đối chiếu về sau.'}
              </DialogDescription>
            </DialogHeader>
            <Tabs value={mode} onValueChange={(value) => switchMode(value as AuthMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="login" disabled={isSubmitting}>
                  Đăng nhập
                </TabsTrigger>
                <TabsTrigger value="register" disabled={isSubmitting}>
                  Đăng ký
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <form data-auth-fields onSubmit={handleSubmit} noValidate className="space-y-4">
              <fieldset disabled={isSubmitting} className="space-y-4">
                {mode === 'register' && (
                  <FormField id="auth-name" label="Họ và tên" error={errors.fullName}>
                    <Input
                      id="auth-name"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'auth-name-error' : undefined}
                    />
                  </FormField>
                )}
                <FormField id="auth-email" label="Email" error={errors.email}>
                  <Input
                    id="auth-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@email.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'auth-email-error' : undefined}
                  />
                </FormField>
                <FormField id="auth-password" label="Mật khẩu" error={errors.password}>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      className="pr-12"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'auth-password-error' : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </FormField>
                {mode === 'login' && (
                  <FormField id="auth-captcha" label="Mã xác nhận" error={errors.captcha}>
                    <div className="flex flex-wrap gap-3">
                      <fieldset
                        className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-border bg-secondary pl-3"
                        aria-label={`Mã CAPTCHA: ${captchaCode}`}
                      >
                        <strong className="font-mono text-lg tracking-widest text-primary">
                          {captchaCode}
                        </strong>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={refreshCaptcha}
                          aria-label="Tạo mã CAPTCHA mới"
                        >
                          <RefreshCw />
                        </Button>
                      </fieldset>
                      <Input
                        id="auth-captcha"
                        className="min-w-24 flex-1"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                        autoComplete="off"
                        maxLength={5}
                        placeholder="Nhập mã"
                        aria-invalid={Boolean(errors.captcha)}
                        aria-describedby={errors.captcha ? 'auth-captcha-error' : undefined}
                      />
                    </div>
                  </FormField>
                )}
                {mode === 'login' ? (
                  <Label className="flex min-h-11 items-center gap-3 font-normal">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(value) => setRemember(value === true)}
                    />
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </Label>
                ) : (
                  <div className="space-y-3">
                    <Label className="flex min-h-11 items-start gap-3 text-sm font-normal leading-6">
                      <Checkbox
                        checked={hasAcceptedTerms}
                        onCheckedChange={(value) => setHasAcceptedTerms(value === true)}
                        aria-invalid={Boolean(errors.terms)}
                        aria-describedby={errors.terms ? 'auth-terms-error' : undefined}
                        className="mt-1"
                      />
                      <span>
                        Tôi đã đọc và đồng ý với <strong>Điều khoản sử dụng</strong> và{' '}
                        <strong>Chính sách quyền riêng tư</strong> của AgriAI.
                      </span>
                    </Label>
                    <details className="mt-2 border-t border-border pt-2 text-xs leading-5 text-muted-foreground">
                      <summary className="cursor-pointer font-bold text-muted-foreground">
                        Đọc điều khoản và hành vi bị cấm
                      </summary>
                      <div className="mt-3 max-h-44 space-y-3 overflow-y-auto pr-2">
                        <section>
                          <h3 className="font-semibold text-muted-foreground">
                            Quyền sở hữu trí tuệ
                          </h3>
                          <p className="mt-1">
                            Tên gọi, logo, giao diện, mã nguồn, mô hình AI, dữ liệu, tài liệu và nội
                            dung do AgriAI phát triển thuộc quyền sở hữu của AgriAI hoặc bên cấp
                            phép hợp pháp.
                          </p>
                        </section>
                        <section>
                          <h3 className="font-semibold text-muted-foreground">
                            Các hành vi không được phép
                          </h3>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            <li>
                              Sao chép, chiếm đoạt, sửa đổi hoặc phân phối mã nguồn, giao diện, mô
                              hình AI, dữ liệu hay tài liệu của AgriAI khi chưa được cho phép.
                            </li>
                            <li>
                              Đảo ngược, giải mã, trích xuất mô hình hoặc dùng kỹ thuật tự động để
                              thu thập dữ liệu và tái tạo sản phẩm cạnh tranh.
                            </li>
                            <li>
                              Mạo danh AgriAI, sử dụng trái phép tên thương mại, logo hoặc tuyên bố
                              sản phẩm của AgriAI là sản phẩm của mình.
                            </li>
                            <li>
                              Xâm nhập, dò quét lỗ hổng, phá hoại hệ thống, vượt giới hạn truy cập
                              hoặc gây gián đoạn dịch vụ.
                            </li>
                            <li>
                              Tải lên mã độc, nội dung bất hợp pháp, dữ liệu xâm phạm bản quyền,
                              quyền riêng tư hoặc quyền của tổ chức và cá nhân khác.
                            </li>
                            <li>
                              Bán lại, cho thuê hoặc khai thác dịch vụ vì mục đích thương mại khi
                              chưa có chấp thuận bằng văn bản.
                            </li>
                          </ul>
                        </section>
                        <section>
                          <h3 className="font-semibold text-muted-foreground">
                            Trách nhiệm sử dụng
                          </h3>
                          <p className="mt-1">
                            Kết quả chẩn đoán chỉ mang tính hỗ trợ tham khảo, không thay thế ý kiến
                            chuyên gia. Vi phạm có thể dẫn đến khóa tài khoản và xử lý theo quy định
                            pháp luật.
                          </p>
                        </section>
                      </div>
                    </details>

                    {errors.terms && (
                      <p id="auth-terms-error" role="alert" className="text-sm text-destructive">
                        {errors.terms}
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
              {serverError && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {serverError}
                </p>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}
function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={id + '-error'} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
