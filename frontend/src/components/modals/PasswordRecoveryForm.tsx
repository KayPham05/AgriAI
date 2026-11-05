import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, resetPassword } from '@/services/authApi';

interface PasswordRecoveryFormProps {
  initialEmail: string;
  onBack: () => void;
}

export function PasswordRecoveryForm({ initialEmail, onBack }: PasswordRecoveryFormProps) {
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      if (step === 'email') {
        await requestPasswordReset(email.trim());
        setStep('code');
      } else {
        await resetPassword(String(data.get('code')).trim(), String(data.get('password')));
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
        <DialogTitle>Đặt lại mật khẩu</DialogTitle>
        <DialogDescription>
          {step === 'email' && 'Nhập email bạn đã dùng để đăng ký AgriAI.'}
          {step === 'code' &&
            'Nếu email có tài khoản phù hợp, bạn sẽ nhận được mã có hiệu lực trong 15 phút.'}
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
                <div className="flex flex-col gap-2">
                  <Label htmlFor="recovery-code">Mã trong email</Label>
                  <Input
                    id="recovery-code"
                    name="code"
                    autoComplete="one-time-code"
                    pattern="[a-fA-F0-9]{32}"
                    maxLength={32}
                    required
                  />
                </div>
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
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit">
              {pending ? 'Đang xử lý…' : step === 'email' ? 'Gửi mã' : 'Đổi mật khẩu'}
            </Button>
            {step === 'code' && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError('');
                  setStep('email');
                }}
              >
                Gửi lại mã hoặc đổi email
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
