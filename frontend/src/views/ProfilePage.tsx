import { useState } from 'react';
import { Edit2, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DiagnosisResult, UserProfile } from '../types';

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
  const [draft, setDraft] = useState(profile);
  const healthyCount = history.filter((item) => item.isHealthy).length;
  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || 'L';

  const beginEditing = () => {
    setDraft(profile);
    setIsEditing(true);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdateProfile({
      ...profile,
      name: draft.name.trim(),
      role: draft.role.trim(),
      location: draft.location.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-10 sm:px-8 lg:px-12">
      <header className="border-b border-border pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {isAuthenticated ? 'Hồ sơ của tôi' : 'Hồ sơ dùng thử'}
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Thông tin cá nhân và các mẫu lá bạn đã lưu.
        </p>
      </header>
      <section className="rounded-card border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              width={80}
              height={80}
              className="size-20 rounded-card object-cover"
            />
          ) : (
            <div
              className="grid size-20 shrink-0 place-items-center rounded-card bg-primary text-2xl font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-2xl font-semibold">{profile.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{profile.role}</p>
            {profile.email && (
              <p className="mt-2 break-all text-sm text-muted-foreground">{profile.email}</p>
            )}
          </div>
          <Button variant="outline" onClick={isEditing ? () => setIsEditing(false) : beginEditing}>
            <Edit2 />
            {isEditing ? 'Hủy chỉnh sửa' : 'Sửa thông tin'}
          </Button>
        </div>
        {isEditing ? (
          <form
            onSubmit={save}
            className="mt-7 grid gap-5 border-t border-border pt-7 md:grid-cols-3"
          >
            <div className="space-y-2">
              <Label htmlFor="profile-name">Họ và tên</Label>
              <Input
                id="profile-name"
                autoComplete="name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Vai trò / Chuyên ngành</Label>
              <Input
                id="profile-role"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-location">Khu vực canh tác / Trạm</Label>
              <Input
                id="profile-location"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div className="space-y-3 md:col-span-3">
              <p className="text-sm text-muted-foreground">
                Thông tin hiển thị chỉ được giữ trong phiên hiện tại, chưa lưu vào tài khoản.
              </p>
              <Button type="submit" disabled={!draft.name.trim()}>
                <Check /> Lưu thay đổi
              </Button>
            </div>
          </form>
        ) : (
          <dl className="mt-7 grid gap-5 border-t border-border pt-7 md:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Khu vực</dt>
              <dd className="mt-1">{profile.location || 'Chưa cập nhật'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Ngày tham gia</dt>
              <dd className="mt-1">{profile.joinedDate}</dd>
            </div>
          </dl>
        )}
      </section>
      <section>
        <h2 className="text-2xl font-semibold">Mẫu đã lưu</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Thống kê từ lịch sử hiện có, không phản ánh tình trạng của toàn bộ vườn.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-5 border-y border-border py-6 md:grid-cols-3">
          {[
            ['Tổng số mẫu', history.length],
            ['Dự đoán khỏe mạnh', healthyCount],
            ['Dự đoán có bệnh', history.length - healthyCount],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-3xl font-semibold tabular-nums text-primary">{value}</dd>
            </div>
          ))}
        </dl>
        {history.length === 0 && (
          <p className="mt-5 text-sm text-muted-foreground">
            Bạn chưa có mẫu nào. Kết quả đã lưu sẽ được tổng hợp tại đây.
          </p>
        )}
      </section>
      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Phiên đăng nhập</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAuthenticated
              ? 'Bạn đang sử dụng tài khoản AgriAI.'
              : 'Bạn đang sử dụng phiên dùng thử trên trình duyệt này.'}
          </p>
        </div>
        {isAuthenticated ? (
          <Button variant="outline" onClick={onLogout}>
            <LogOut /> Đăng xuất
          </Button>
        ) : (
          <Button onClick={onOpenLogin}>Đăng nhập / Đăng ký</Button>
        )}
      </section>
    </div>
  );
}
