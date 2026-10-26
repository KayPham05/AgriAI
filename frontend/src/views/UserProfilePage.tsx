'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { PrivateImage } from '@/components/common/PrivateImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import {
  getUserProfile,
  updateUserProfile,
  UserApiError,
  uploadUserAvatar,
  type UserProfileDto,
} from '@/services/userApi';

interface UserProfilePageProps {
  token: string;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  onAccountUpdated: (profile: UserProfileDto) => void;
  onLogout: () => void;
  onNotifications?: () => void;
}

export function UserProfilePage({
  token,
  avatarUrl,
  onAvatarChange,
  onAccountUpdated,
  onLogout,
  onNotifications,
}: UserProfilePageProps) {
  const [account, setAccount] = useState<UserProfileDto | null>(null);
  const [name, setName] = useState('');
  const [loadError, setLoadError] = useState('');
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const saveRequest = useRef<AbortController | null>(null);
  useEffect(() => () => saveRequest.current?.abort(), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly reloads the account after the user retries.
  useEffect(() => {
    const controller = new AbortController();
    setAccount(null);
    setLoadError('');
    setExpired(false);
    getUserProfile(token, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setAccount(result);
        setName(result.fullName);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setExpired(cause instanceof UserApiError && cause.status === 401);
        setLoadError(
          cause instanceof Error ? cause.message : 'Không thể tải hồ sơ. Vui lòng thử lại.',
        );
      });
    return () => controller.abort();
  }, [token, attempt]);

  const expire = () => {
    setPasswordOpen(false);
    setExpired(true);
    setAccount(null);
    setName('');
    setLoadError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saveRequest.current || !account) return;
    setSaved(false);
    if (!name.trim()) return setError('Họ và tên không được để trống.');
    if (name.trim().length > 60) return setError('Họ và tên không được vượt quá 60 ký tự.');
    const controller = new AbortController();
    saveRequest.current = controller;
    setPending(true);
    setError('');
    try {
      const result = await updateUserProfile(token, name, controller.signal);
      if (controller.signal.aborted) return;
      setAccount(result);
      setName(result.fullName);
      onAccountUpdated(result);
      setSaved(true);
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof UserApiError && cause.status === 401) expire();
      else
        setError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ. Vui lòng thử lại.');
    } finally {
      if (!controller.signal.aborted) {
        saveRequest.current = null;
        setPending(false);
      }
    }
  }

  const initials = account?.fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const role = account?.role === 'Admin' ? 'Quản trị viên' : 'Thành viên AgriAI';
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Tài khoản / Hồ sơ cá nhân</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hồ sơ của bạn</h1>
        <p className="text-base leading-7 text-muted-foreground">
          Quản lý thông tin cá nhân và tùy chỉnh trải nghiệm AgriVision AI.
        </p>
      </header>
      {loadError ? (
        <section
          className="flex flex-col items-start gap-4 rounded-card bg-surface p-6"
          aria-label="Không thể tải hồ sơ"
        >
          <p role="alert">{loadError}</p>
          <Button onClick={expired ? onLogout : () => setAttempt((value) => value + 1)}>
            {expired ? 'Đăng nhập lại' : 'Thử lại'}
          </Button>
        </section>
      ) : !account ? (
        <p role="status" className="py-10 text-muted-foreground">
          Đang tải hồ sơ tài khoản…
        </p>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-4">
          <aside
            className="flex min-w-0 flex-col gap-4 rounded-card bg-surface p-6 lg:col-span-1"
            aria-label="Điều hướng tài khoản"
          >
            {account.avatarUrl ? (
              <PrivateImage
                src={account.avatarUrl}
                width={72}
                height={72}
                alt={`Ảnh đại diện của ${account.fullName}`}
                className="size-18 rounded-full object-cover"
              />
            ) : (
              <div
                className="grid size-18 shrink-0 place-items-center rounded-full bg-secondary text-2xl font-bold text-primary"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
            <h2 className="break-words text-xl font-bold [overflow-wrap:anywhere]">
              {account.fullName}
            </h2>
            <p className="text-sm text-muted-foreground">Tài khoản cá nhân</p>
            <Separator />
            <nav className="flex flex-col gap-2" aria-label="Cài đặt tài khoản">
              <Button asChild variant="secondary" className="justify-start rounded-xl">
                <a href="#personal-information">
                  <UserRound data-icon="inline-start" />
                  Thông tin cá nhân
                </a>
              </Button>
              <Button asChild variant="ghost" className="justify-start">
                <a href="#account-security">
                  <ShieldCheck data-icon="inline-start" />
                  Bảo mật & đăng nhập
                </a>
              </Button>
              {onNotifications && (
                <Button variant="ghost" className="justify-start" onClick={onNotifications}>
                  Thông báo
                </Button>
              )}
              <Button asChild variant="ghost" className="justify-start">
                <a href="#account-preferences">Tùy chọn sử dụng</a>
              </Button>
            </nav>
            <Separator />
            <p className="text-xs leading-5 text-muted-foreground">
              Thông tin tài khoản chỉ hiển thị trong phiên đăng nhập của bạn.
            </p>
            <Button variant="outline" onClick={onLogout}>
              <LogOut data-icon="inline-start" />
              Đăng xuất
            </Button>
          </aside>

          <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
            <section
              id="personal-information"
              aria-labelledby="personal-title"
              className="scroll-mt-24 rounded-card bg-surface p-6 sm:p-8"
            >
              <form
                onSubmit={save}
                noValidate
                className="flex flex-col gap-6"
                aria-label="Chỉnh sửa thông tin cá nhân"
              >
                <div className="flex flex-col gap-2">
                  <h2 id="personal-title" className="text-2xl font-bold">
                    Thông tin cá nhân
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Thông tin giúp chúng tôi đồng hành cùng bạn tốt hơn.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-5">
                  <div className="w-24 shrink-0">
                    <ProfileAvatarEditor
                      name={account.fullName}
                      avatarUrl={account.avatarUrl ?? avatarUrl}
                      onChange={onAvatarChange}
                      onUpload={async (file, signal) => {
                        try {
                          const result = await uploadUserAvatar(token, file, signal);
                          if (signal.aborted) return;
                          setAccount(result);
                          onAccountUpdated(result);
                        } catch (cause) {
                          if (cause instanceof UserApiError && cause.status === 401) expire();
                          throw cause;
                        }
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className="font-semibold">Ảnh đại diện</p>
                    <p id="profile-avatar-help" className="text-sm leading-6 text-muted-foreground">
                      JPG hoặc PNG, tối đa 15 MB. Ảnh được lưu vào tài khoản sau khi xác nhận.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="grid min-w-0 gap-6 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Label htmlFor="account-name">Họ và tên</Label>
                    <Input
                      id="account-name"
                      className="rounded-xl border-border"
                      autoComplete="name"
                      value={name}
                      disabled={pending}
                      aria-invalid={Boolean(error)}
                      aria-describedby={
                        error ? 'account-save-error account-name-help' : 'account-name-help'
                      }
                      onChange={(event) => {
                        setName(event.target.value);
                        setSaved(false);
                        setError('');
                      }}
                    />
                    <p id="account-name-help" className="text-xs text-muted-foreground">
                      Tối đa 60 ký tự.
                    </p>
                  </div>
                  <ReadOnlyField id="account-email" label="Email" value={account.email} />
                  <ReadOnlyField id="account-role" label="Vai trò" value={role} />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Email dùng để đăng nhập. Email và vai trò được hiển thị ở chế độ chỉ đọc.
                </p>
                {error && (
                  <p id="account-save-error" role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                {saved && (
                  <p role="status" className="text-sm text-primary">
                    Đã cập nhật hồ sơ tài khoản.
                  </p>
                )}
                <Separator />
                <div className="flex flex-wrap justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setName(account.fullName);
                      setError('');
                      setSaved(false);
                    }}
                  >
                    Hủy thay đổi
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-2">
              <section
                id="account-security"
                aria-labelledby="security-title"
                className="flex scroll-mt-24 flex-col gap-4 rounded-card bg-surface p-6"
              >
                <h2 id="security-title" className="text-xl font-bold">
                  Bảo mật tài khoản
                </h2>
                <p className="text-sm text-muted-foreground">Chủ động bảo vệ thông tin của bạn.</p>
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Mật khẩu</p>
                  <Button type="button" variant="link" onClick={() => setPasswordOpen(true)}>
                    Đổi mật khẩu
                  </Button>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  Lần đổi mật khẩu gần nhất: chưa có thông tin.
                </p>
              </section>
              <section
                id="account-preferences"
                aria-labelledby="preferences-title"
                className="flex scroll-mt-24 flex-col gap-4 rounded-card bg-surface p-6"
              >
                <h2 id="preferences-title" className="text-xl font-bold">
                  Tùy chọn sử dụng
                </h2>
                <p className="text-sm text-muted-foreground">Thiết lập hiện tại của ứng dụng.</p>
                <Separator />
                <dl className="flex flex-col gap-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt>Ngôn ngữ</dt>
                    <dd>Tiếng Việt</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt>Múi giờ</dt>
                    <dd>GMT+7 · Việt Nam</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          if (!passwordPending) setPasswordOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
            <DialogDescription>Bảo vệ tài khoản bằng mật khẩu mới.</DialogDescription>
          </DialogHeader>
          {passwordOpen && (
            <PasswordChangeForm
              token={token}
              onChanged={onLogout}
              onExpired={expire}
              onPendingChange={setPasswordPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} readOnly className="rounded-xl border-border" />
    </div>
  );
}
