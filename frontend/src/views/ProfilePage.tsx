'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Check,
  Edit2,
  FolderHeart,
  Leaf,
  LogOut,
  MapPin,
  Sprout,
  UserRound,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ProfileAvatarEditor } from '@/components/profile/ProfileAvatarEditor';
import type { DiagnosisResult, UserProfile } from '@/types';

interface ProfileViewProps {
  profile: UserProfile;
  history: DiagnosisResult[];
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenLogin: () => void;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function ProfilePage({
  profile,
  history,
  onUpdateProfile,
  onOpenLogin,
  isAuthenticated,
  onLogout,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [draft, setDraft] = useState(profile);
  const healthyCount = history.filter((item) => item.isHealthy).length;

  const beginEditing = () => {
    setDraft(profile);
    setHasSaved(false);
    setIsEditing(true);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    onUpdateProfile({
      ...profile,
      name: draft.name.trim(),
      role: draft.role.trim(),
      location: draft.location.trim(),
    });
    setIsEditing(false);
    setHasSaved(true);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {isAuthenticated ? 'Hồ sơ của tôi' : 'Hồ sơ dùng thử'}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Thông tin cá nhân và các mẫu lá bạn đã lưu.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-4 lg:gap-8">
        <aside
          className="min-w-0 overflow-hidden rounded-card border border-border bg-surface lg:col-span-1"
          aria-label="Tổng quan hồ sơ"
        >
          <div className="flex items-center gap-4 bg-surface-muted p-6 lg:flex-col lg:py-8 lg:text-center">
            <ProfileAvatarEditor
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              onChange={(avatarUrl) => onUpdateProfile({ ...profile, avatarUrl })}
            />
            <div className="min-w-0 flex-1 lg:w-full">
              <h2 className="break-words text-xl font-bold leading-8">{profile.name}</h2>
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                {profile.role || 'Chưa cập nhật vai trò'}
              </p>
              <div className="mt-3">
                <Badge variant="secondary">
                  {isAuthenticated ? 'Tài khoản AgriAI' : 'Phiên dùng thử'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-5 p-6">
            <p id="profile-avatar-help" className="text-xs leading-5 text-muted-foreground">
              Ảnh JPG hoặc PNG, tối đa 15 MB. Ảnh đại diện chỉ được giữ trong phiên hiện tại.
            </p>
            <dl className="grid grid-cols-2 gap-4 text-sm lg:flex lg:flex-col">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Khu vực</dt>
                  <dd className="mt-1 break-words font-medium">
                    {profile.location || 'Chưa cập nhật'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Ngày tham gia</dt>
                  <dd className="mt-1 break-words font-medium">{profile.joinedDate}</dd>
                </div>
              </div>
            </dl>
            <Separator />
            <section aria-labelledby="profile-session-title" className="flex flex-col gap-3">
              <h2 id="profile-session-title" className="text-sm font-semibold">
                Phiên đăng nhập
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {isAuthenticated
                  ? 'Bạn đang sử dụng tài khoản AgriAI.'
                  : 'Bạn đang sử dụng phiên dùng thử trên trình duyệt này.'}
              </p>
              {isAuthenticated ? (
                <Button variant="outline" onClick={onLogout} className="w-full">
                  <LogOut data-icon="inline-start" />
                  Đăng xuất
                </Button>
              ) : (
                <Button onClick={onOpenLogin} className="w-full">
                  Đăng nhập / Đăng ký
                </Button>
              )}
            </section>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-3">
          <section
            aria-labelledby="profile-details-title"
            className="overflow-hidden rounded-card border border-border bg-surface"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <h2 id="profile-details-title" className="text-xl font-bold">
                  Thông tin cá nhân
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={isEditing ? () => setIsEditing(false) : beginEditing}
              >
                {isEditing ? <X data-icon="inline-start" /> : <Edit2 data-icon="inline-start" />}
                {isEditing ? 'Hủy chỉnh sửa' : 'Sửa thông tin'}
              </Button>
            </div>
            <Separator />
            <div className="p-6 sm:p-8">
              {isEditing ? (
                <form
                  onSubmit={save}
                  className="flex flex-col gap-6"
                  aria-label="Chỉnh sửa thông tin cá nhân"
                >
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-3 sm:col-span-2">
                      <Label htmlFor="profile-name">Họ và tên</Label>
                      <Input
                        id="profile-name"
                        autoComplete="name"
                        required
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="profile-role">Vai trò / Chuyên ngành</Label>
                      <Input
                        id="profile-role"
                        value={draft.role}
                        onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <Label htmlFor="profile-location">Khu vực canh tác / Trạm</Label>
                      <Input
                        id="profile-location"
                        value={draft.location}
                        onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      Thông tin hiển thị chỉ được giữ trong phiên hiện tại, chưa lưu vào tài khoản.
                    </p>
                    <Button type="submit" disabled={!draft.name.trim()}>
                      <Check data-icon="inline-start" />
                      Lưu thay đổi
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                  {[
                    ['Họ và tên', profile.name],
                    ['Vai trò / Chuyên ngành', profile.role],
                    ['Email tài khoản', profile.email],
                    ['Khu vực canh tác / Trạm', profile.location],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="mt-2 break-words font-semibold [overflow-wrap:anywhere]">
                        {value || 'Chưa cập nhật'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {hasSaved && (
                <p
                  role="status"
                  className="mt-6 flex items-start gap-2 text-sm leading-6 text-primary"
                >
                  <Check className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  Đã cập nhật thông tin trong phiên này.
                </p>
              )}
            </div>
          </section>

          <section
            className="rounded-card border border-border bg-surface p-6 sm:p-8"
            aria-labelledby="agricultural-profiles-link-title"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Sprout className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 id="agricultural-profiles-link-title" className="text-xl font-bold">
                    Hồ sơ nông nghiệp
                  </h2>
                  <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
                    Tổ chức từng khu vực canh tác và gắn kết lịch sử chẩn đoán của bạn.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/agricultural-profiles">Quản lý hồ sơ</Link>
              </Button>
            </div>
          </section>

          <section
            aria-labelledby="profile-samples-title"
            className="rounded-card border border-border bg-surface p-6 sm:p-8"
          >
            <div className="flex items-center gap-3">
              <FolderHeart className="size-5 text-primary" aria-hidden="true" />
              <h2 id="profile-samples-title" className="text-xl font-bold">
                Mẫu đã lưu
              </h2>
            </div>
            <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
              Thống kê từ lịch sử hiện có, không phản ánh tình trạng của toàn bộ vườn.
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-2 rounded-card bg-surface-muted p-4 sm:gap-4 sm:p-6">
              {[
                ['Tổng số mẫu', history.length],
                ['Dự đoán khỏe mạnh', healthyCount],
                ['Dự đoán có bệnh', history.length - healthyCount],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="min-h-18 text-sm leading-6 text-muted-foreground sm:min-h-0">
                    {label}
                  </dt>
                  <dd className="mt-2 text-3xl font-bold tabular-nums text-primary">{value}</dd>
                </div>
              ))}
            </dl>
            {history.length === 0 && (
              <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <Leaf className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                Bạn chưa có mẫu nào. Kết quả đã lưu sẽ được tổng hợp tại đây.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
