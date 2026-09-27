import React, { useEffect, useId, useState } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { AuthSession, login, register, saveAuthSession } from '../../services/authApi';

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
  return Array.from({ length: 5 }, () => captchaCharacters[Math.floor(Math.random() * captchaCharacters.length)]).join('');
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) => {
  const titleId = useId();
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

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, isSubmitting, onClose]);

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
      const session = mode === 'register'
        ? await register({ ...credentials, fullName: fullName.trim() })
        : await login(credentials);
      saveAuthSession(session, remember);
      onAuthSuccess(session);
      onClose();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      if (mode === 'login') refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#102419]/70 p-2 backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <div className="relative my-2 grid w-full max-w-[980px] overflow-hidden rounded-[24px] border border-white/50 bg-[#fffef9] shadow-[0_36px_100px_rgba(8,35,20,.35)] sm:my-0 sm:rounded-[30px] lg:grid-cols-[.92fr_1.08fr]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" onClick={onClose} disabled={isSubmitting} aria-label="Đóng" className="absolute right-4 top-4 z-20 rounded-full border border-[#dce8d8] bg-white/90 p-2 text-[#4f6655] shadow-sm transition hover:bg-white hover:text-[#173e2a] disabled:opacity-50"><X className="h-5 w-5" /></button>

        <section className="relative hidden min-h-[650px] overflow-hidden bg-[#173e2a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full border-[55px] border-white/[.045]" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#80a863]/15 blur-2xl" />
          <div className="absolute inset-0 opacity-[.08]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-1 ring-1 ring-white/20">
              <img src="/images/logo.png" alt="Logo LeafAI" className="h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,.2)]" />
            </span>
            <div><strong className="text-xl font-black tracking-tight">Leaf<span className="text-[#bdda9e]">AI</span></strong><p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/55">Vì cây trồng Việt</p></div>
          </div>

          <div className="relative space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d9efc7]"><Sparkles className="h-3.5 w-3.5" /> Đồng hành cùng mùa vụ</span>
            <div>
              <h2 className="text-4xl font-black leading-[1.15] tracking-tight text-white">Chăm từng chiếc lá.<br />Giữ trọn mùa xanh.</h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">Đăng nhập để lưu kết quả chẩn đoán, theo dõi cây trồng và tiếp tục công việc trên mọi thiết bị.</p>
            </div>
            <div className="grid gap-3">
              {['Bảo vệ phiên đăng nhập bằng JWT', 'Lưu và quản lý lịch sử chẩn đoán', 'Truy cập hồ sơ canh tác cá nhân'].map((benefit) => <div key={benefit} className="flex items-center gap-3 text-sm text-white/80"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#80a863]/20 text-[#cce5b5]"><Check className="h-3.5 w-3.5" /></span>{benefit}</div>)}
            </div>
          </div>

          <p className="relative flex items-center gap-2 text-xs text-white/45"><ShieldCheck className="h-4 w-4" /> Thông tin của bạn được truyền qua kết nối bảo mật.</p>
        </section>

        <section className="flex min-h-0 items-center px-4 py-10 sm:min-h-[620px] sm:px-12 sm:py-14 lg:min-h-[650px] lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <span className="inline-flex items-center gap-2.5 text-lg font-black text-[#173e2a]">
                <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-[#dce8d8] bg-white p-1 shadow-sm"><img src="/images/logo.png" alt="" className="h-full w-full object-contain" /></span>
                LeafAI
              </span>
            </div>
            <div className="mb-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#66835f]">Tài khoản LeafAI</p>
              <h1 id={titleId} className="text-3xl font-black tracking-tight text-[#173e2a]">{mode === 'login' ? 'Chào mừng bạn trở lại' : 'Bắt đầu hành trình xanh'}</h1>
              <p className="mt-2 text-sm leading-6 text-[#647067]">{mode === 'login' ? 'Đăng nhập để tiếp tục quản lý cây trồng của bạn.' : 'Tạo tài khoản miễn phí để bắt đầu.'}</p>
            </div>

            <div className="mb-7 grid grid-cols-2 rounded-2xl bg-[#edf3e9] p-1.5" role="tablist" aria-label="Chọn hình thức xác thực">
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-[#245c3a] shadow-sm' : 'text-[#708071] hover:text-[#245c3a]'}`}>Đăng nhập</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => switchMode('register')} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${mode === 'register' ? 'bg-white text-[#245c3a] shadow-sm' : 'text-[#708071] hover:text-[#245c3a]'}`}>Đăng ký</button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {mode === 'register' && <FormField id="auth-name" label="Họ và tên" error={errors.fullName}><UserRound className="h-[18px] w-[18px]" /><input id="auth-name" autoComplete="name" autoFocus value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nguyễn Văn An" className="auth-input" aria-invalid={Boolean(errors.fullName)} /></FormField>}
              <FormField id="auth-email" label="Email" error={errors.email}><Mail className="h-[18px] w-[18px]" /><input id="auth-email" type="email" inputMode="email" autoComplete="email" autoFocus={mode === 'login'} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@email.com" className="auth-input" aria-invalid={Boolean(errors.email)} /></FormField>
              <FormField id="auth-password" label="Mật khẩu" error={errors.password} trailing={<button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="rounded-lg p-1 text-[#789078] hover:bg-[#edf3e9] hover:text-[#245c3a]">{showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button>}><LockKeyhole className="h-[18px] w-[18px]" /><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tối thiểu 6 ký tự" className="auth-input" aria-invalid={Boolean(errors.password)} /></FormField>

              {mode === 'login' && (
                <div>
                  <label htmlFor="auth-captcha" className="mb-1.5 block text-sm font-bold text-[#284431]">Mã xác nhận</label>
                  <div className="grid grid-cols-[132px_1fr] gap-3">
                    <div className="relative flex min-h-[52px] select-none items-center justify-center overflow-hidden rounded-2xl border border-[#bfd2b7] bg-[#eaf2e5]" aria-label={`Mã CAPTCHA: ${captchaCode}`}>
                      <span className="absolute inset-0 opacity-35" style={{ backgroundImage: 'repeating-linear-gradient(125deg, transparent 0 13px, #84a77a 14px 15px)' }} />
                      <strong className="relative -rotate-2 font-mono text-xl font-black tracking-[.22em] text-[#245c3a]">{captchaCode}</strong>
                      <button type="button" onClick={refreshCaptcha} aria-label="Tạo mã CAPTCHA mới" className="absolute right-1.5 top-1.5 rounded-lg bg-white/75 p-1 text-[#587553] transition hover:rotate-90 hover:text-[#245c3a]"><RefreshCw className="h-3.5 w-3.5" /></button>
                    </div>
                    <input id="auth-captcha" value={captchaAnswer} onChange={(event) => setCaptchaAnswer(event.target.value.toUpperCase())} autoComplete="off" maxLength={5} placeholder="Nhập mã" aria-invalid={Boolean(errors.captcha)} aria-describedby={errors.captcha ? 'auth-captcha-error' : undefined} className={`min-w-0 rounded-2xl border bg-white px-4 text-sm font-bold uppercase tracking-[.12em] text-[#173e2a] outline-none transition focus:border-[#52814d] focus:ring-4 focus:ring-[#52814d]/10 ${errors.captcha ? 'border-red-300' : 'border-[#dce6d8]'}`} />
                  </div>
                  {errors.captcha && <p id="auth-captcha-error" className="mt-1.5 text-xs font-medium text-red-600">{errors.captcha}</p>}
                </div>
              )}

              {mode === 'login' ? (
                <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-[#56675a]"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-[#b8cab3] accent-[#245c3a]" /><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>
              ) : (
                <div className={`rounded-2xl border p-4 transition ${errors.terms ? 'border-red-300 bg-red-50/50' : 'border-[#dce6d8] bg-[#f7faf5]'}`}>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#56675a]">
                    <input type="checkbox" checked={hasAcceptedTerms} onChange={(event) => setHasAcceptedTerms(event.target.checked)} aria-invalid={Boolean(errors.terms)} aria-describedby={errors.terms ? 'auth-terms-error' : undefined} className="mt-1 h-4 w-4 shrink-0 rounded border-[#b8cab3] accent-[#245c3a]" />
                    <span>Tôi đã đọc và đồng ý với <strong className="font-bold text-[#245c3a]">Điều khoản sử dụng</strong> và <strong className="font-bold text-[#245c3a]">Chính sách quyền riêng tư</strong> của LeafAI.</span>
                  </label>
                  <details className="mt-2 border-t border-[#dce6d8] pt-2 text-xs leading-5 text-[#6f7d71]">
                    <summary className="cursor-pointer font-bold text-[#4d704e]">Đọc điều khoản và hành vi bị cấm</summary>
                    <div className="mt-3 max-h-44 space-y-3 overflow-y-auto pr-2">
                      <section>
                        <h3 className="font-black text-[#284431]">Quyền sở hữu trí tuệ</h3>
                        <p className="mt-1">Tên gọi, logo, giao diện, mã nguồn, mô hình AI, dữ liệu, tài liệu và nội dung do LeafAI phát triển thuộc quyền sở hữu của LeafAI hoặc bên cấp phép hợp pháp.</p>
                      </section>
                      <section>
                        <h3 className="font-black text-[#284431]">Các hành vi không được phép</h3>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          <li>Sao chép, chiếm đoạt, sửa đổi hoặc phân phối mã nguồn, giao diện, mô hình AI, dữ liệu hay tài liệu của LeafAI khi chưa được cho phép.</li>
                          <li>Đảo ngược, giải mã, trích xuất mô hình hoặc dùng kỹ thuật tự động để thu thập dữ liệu và tái tạo sản phẩm cạnh tranh.</li>
                          <li>Mạo danh LeafAI, sử dụng trái phép tên thương mại, logo hoặc tuyên bố sản phẩm của LeafAI là sản phẩm của mình.</li>
                          <li>Xâm nhập, dò quét lỗ hổng, phá hoại hệ thống, vượt giới hạn truy cập hoặc gây gián đoạn dịch vụ.</li>
                          <li>Tải lên mã độc, nội dung bất hợp pháp, dữ liệu xâm phạm bản quyền, quyền riêng tư hoặc quyền của tổ chức và cá nhân khác.</li>
                          <li>Bán lại, cho thuê hoặc khai thác dịch vụ vì mục đích thương mại khi chưa có chấp thuận bằng văn bản.</li>
                        </ul>
                      </section>
                      <section>
                        <h3 className="font-black text-[#284431]">Trách nhiệm sử dụng</h3>
                        <p className="mt-1">Kết quả chẩn đoán chỉ mang tính hỗ trợ tham khảo, không thay thế ý kiến chuyên gia. Vi phạm có thể dẫn đến khóa tài khoản và xử lý theo quy định pháp luật.</p>
                      </section>
                    </div>
                  </details>
                  {errors.terms && <p id="auth-terms-error" className="mt-2 text-xs font-medium text-red-600">{errors.terms}</p>}
                </div>
              )}
              {serverError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{serverError}</div>}
              <button type="submit" disabled={isSubmitting} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#245c3a] px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(36,92,58,.2)] transition hover:-translate-y-0.5 hover:bg-[#1d4d30] hover:shadow-[0_16px_30px_rgba(36,92,58,.26)] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0">{isSubmitting ? <><LoaderCircle className="h-[18px] w-[18px] animate-spin" /> Đang xử lý...</> : <>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" /></>}</button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-[#7a877c]">LeafAI sử dụng kết nối bảo mật để bảo vệ thông tin tài khoản của bạn.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, error, trailing, children }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-[#284431]">{label}</label>
    <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-[#708071] transition focus-within:border-[#52814d] focus-within:ring-4 focus-within:ring-[#52814d]/10 ${error ? 'border-red-300' : 'border-[#dce6d8]'}`}>
      {children}
      {trailing}
    </div>
    {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
  </div>
);
