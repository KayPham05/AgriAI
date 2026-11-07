'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  changePassword,
  requestPasswordChangeCode,
  resendPasswordChangeCode,
  UserApiError,
} from '@/services/userApi';

export function PasswordChangeForm({
  token,
  email,
  onChanged,
  onExpired,
  onPendingChange,
}: {
  token: string;
  email: string;
  onChanged: () => void;
  onExpired: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resending, setResending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!challengeId || secondsLeft === 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [challengeId, secondsLeft]);

  function validatePasswordFields() {
    if (!values.currentPassword.trim()) return 'Vui lòng nhập mật khẩu hiện tại.';
    if (!values.newPassword.trim() || values.newPassword.length < 6)
      return 'Mật khẩu mới phải có ít nhất 6 ký tự.';
    if (values.newPassword !== values.confirmPassword) return 'Mật khẩu xác nhận không khớp.';
    if (values.newPassword === values.currentPassword)
      return 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
    return '';
  }

  async function sendCode() {
    const validationError = validatePasswordFields();
    if (validationError) return setError(validationError);
    setPending(true);
    onPendingChange(true);
    setError('');
    try {
      const challenge = await requestPasswordChangeCode(token);
      setChallengeId(challenge.challengeId);
      setVerificationCode('');
      setSecondsLeft(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi mã xác nhận.');
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  async function resendCode() {
    if (!challengeId || secondsLeft > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const challenge = await resendPasswordChangeCode(token, challengeId);
      setChallengeId(challenge.challengeId);
      setVerificationCode('');
      setSecondsLeft(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi lại mã xác nhận.');
    } finally {
      setResending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (request.current) return;
    const validationError = validatePasswordFields();
    if (validationError) return setError(validationError);
    if (!challengeId) return setError('Vui lòng gửi mã xác nhận đến email trước.');
    if (!/^[0-9]{8}$/.test(verificationCode))
      return setError('Vui lòng nhập mã xác nhận 8 chữ số.');
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    onPendingChange(true);
    setError('');
    try {
      await changePassword(
        token,
        { ...values, verificationChallengeId: challengeId, verificationCode },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChallengeId('');
      setVerificationCode('');
      onChanged();
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof UserApiError && cause.status === 401) {
        setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
        onExpired();
      } else
        setError(
          cause instanceof Error ? cause.message : 'Không thể đổi mật khẩu. Vui lòng thử lại.',
        );
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
        onPendingChange(false);
      }
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5"
      aria-label="Đổi mật khẩu tài khoản"
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Mật khẩu mới có ít nhất 6 ký tự. Sau khi đổi thành công, bạn sẽ được đăng xuất và cần đăng
        nhập lại trên mọi thiết bị.
      </p>
      <p className="text-sm text-muted-foreground">
        Mã xác nhận sẽ được gửi đến <strong>{email}</strong> và có hiệu lực trong 60 giây.
      </p>
      {(
        [
          ['currentPassword', 'Mật khẩu hiện tại', 'current-password'],
          ['newPassword', 'Mật khẩu mới', 'new-password'],
          ['confirmPassword', 'Xác nhận mật khẩu mới', 'new-password'],
        ] as const
      ).map(([key, label, autoComplete]) => (
        <div key={key} className="flex flex-col gap-2">
          <Label htmlFor={`password-${key}`}>{label}</Label>
          <Input
            id={`password-${key}`}
            type="password"
            autoComplete={autoComplete}
            required
            disabled={pending}
            value={values[key]}
            onChange={(event) => setValues({ ...values, [key]: event.target.value })}
            aria-describedby={error ? 'password-error' : undefined}
          />
        </div>
      ))}
      {challengeId && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="password-verification-code">Mã xác nhận email</Label>
          <Input
            id="password-verification-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{8}"
            maxLength={8}
            value={verificationCode}
            onChange={(event) =>
              setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 8))
            }
            disabled={pending}
            required
          />
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
        </div>
      )}
      {error && (
        <p id="password-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!challengeId ? (
        <Button type="button" disabled={pending} onClick={() => void sendCode()}>
          {pending ? 'Đang gửi mã…' : 'Gửi mã xác nhận'}
        </Button>
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
        </Button>
      )}
    </form>
  );
}
