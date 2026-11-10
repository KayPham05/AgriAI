import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EmailCodeForm({
  onVerify,
  onResend,
}: {
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  async function resend() {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await onResend();
      setSecondsLeft(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi lại mã.');
    } finally {
      setResending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('code'));
    setPending(true);
    setError('');
    try {
      await onVerify(code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xác minh mã. Vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="flex flex-col gap-3" disabled={pending}>
        <Label htmlFor="email-verification-code">Mã xác minh</Label>
        <Input
          id="email-verification-code"
          name="code"
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          autoComplete="one-time-code"
          required
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit">{pending ? 'Đang xác minh…' : 'Xác minh mã'}</Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void resend()}
          disabled={secondsLeft > 0 || resending || pending}
        >
          {resending
            ? 'Đang gửi lại…'
            : secondsLeft > 0
              ? `Gửi lại mã sau ${secondsLeft}s`
              : 'Gửi lại mã'}
        </Button>
      </fieldset>
    </form>
  );
}
