import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, resetPassword, verifyPasswordResetCode } from '@/services/authApi';

interface PasswordRecoveryFormProps {
  initialEmail: string;
  onBack: () => void;
}

export function PasswordRecoveryForm({ initialEmail, onBack }: PasswordRecoveryFormProps) {
  const [step, setStep] = useState<'email' | 'code' | 'password' | 'done'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (step !== 'code' || secondsLeft === 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, step]);

  async function resendCode() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setCode('');
      setSecondsLeft(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi lại mã.');
    } finally {
      setResending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      if (step === 'email') {
        await requestPasswordReset(email.trim());
        setSecondsLeft(60);
        setStep('code');
      } else if (step === 'code') {
        await verifyPasswordResetCode(code.trim());
        setStep('password');
      } else {
        const password = String(data.get('password'));
        if (password !== String(data.get('confirmPassword'))) {
          throw new Error('Mật khẩu xác nhận không khớp.');
        }
        await resetPassword(code.trim(), password);
        setStep('done');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-center">Đặt lại mật khẩu</DialogTitle>
        <DialogDescription>
          {step === 'email' && 'Nhập email bạn đã dùng để đăng ký AgriAI.'}
          {step === 'code' && 'Nhập mã 8 chữ số trong email để tiếp tục.'}
          {step === 'password' && 'Tạo mật khẩu mới rồi xác nhận để hoàn tất.'}
          {step === 'done' && 'Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.'}
        </DialogDescription>
      </DialogHeader>
      {step !== 'done' && (
        <form onSubmit={submit}>
          <fieldset disabled={pending} className="flex flex-col gap-4">
            {step === 'email' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="recovery-email">Email</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={254}
                />
              </div>
            ) : (
              <>
                {step === 'code' && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recovery-code">Mã trong email</Label>
                    <Input
                      id="recovery-code"
                      name="code"
                      autoComplete="one-time-code"
                      pattern="[0-9]{8}"
                      maxLength={8}
                      inputMode="numeric"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 8))
                      }
                      required
                    />
                  </div>
                )}
                {step === 'password' && <input type="hidden" name="code" value={code} />}
                {step === 'password' && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recovery-password">Mật khẩu mới</Label>
                    <Input
                      id="recovery-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={72}
                      required
                    />
                  </div>
                )}
                {step === 'password' && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="recovery-confirm-password">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="recovery-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={72}
                      required
                    />
                  </div>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit">
              {pending
                ? 'Đang xử lý…'
                : step === 'email'
                  ? 'Gửi mã'
                  : step === 'code'
                    ? 'Tiếp theo'
                    : 'Đổi mật khẩu'}
            </Button>
            {step === 'code' && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void resendCode()}
                disabled={secondsLeft > 0 || resending || pending}
              >
                {resending
                  ? 'Đang gửi lại…'
                  : secondsLeft > 0
                    ? `Gửi lại mã sau ${secondsLeft}s`
                    : 'Gửi lại mã'}
              </Button>
            )}
            {(step === 'code' || step === 'password') && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError('');
                  setStep(step === 'password' ? 'code' : 'email');
                  if (step === 'password') setSecondsLeft(0);
                }}
              >
                Đổi tài khoản email
              </Button>
            )}
          </fieldset>
        </form>
      )}
      <Button type="button" variant="ghost" disabled={pending} onClick={onBack}>
        Quay lại đăng nhập
      </Button>
    </>
  );
}
