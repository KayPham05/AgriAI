'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword, UserApiError } from '@/services/userApi';

export function PasswordChangeForm({
  token,
  onChanged,
  onExpired,
  onPendingChange,
}: {
  token: string;
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
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (request.current) return;
    if (!values.currentPassword.trim()) return setError('Vui lòng nhập mật khẩu hiện tại.');
    if (!values.newPassword.trim() || values.newPassword.length < 6)
      return setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (values.newPassword !== values.confirmPassword)
      return setError('Mật khẩu xác nhận không khớp.');
    if (values.newPassword === values.currentPassword)
      return setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    onPendingChange(true);
    setError('');
    try {
      await changePassword(token, values, controller.signal);
      if (controller.signal.aborted) return;
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
      {error && (
        <p id="password-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
      </Button>
    </form>
  );
}
