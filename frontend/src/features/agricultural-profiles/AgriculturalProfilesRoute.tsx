'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgriculturalProfiles, useAuth, useHistory } from '@/providers/AppContexts';
import type { AgriculturalProfileInput } from '@/services/agriculturalProfileApi';
import { AgriculturalProfileCard } from '@/components/agricultural-profile/AgriculturalProfileCard';
import { AgriculturalProfileForm } from '@/components/agricultural-profile/AgriculturalProfileForm';
import { AgriculturalProfileHistory } from '@/components/agricultural-profile/AgriculturalProfileHistory';

type View =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'detail' | 'edit' | 'delete'; id: string };

export function AgriculturalProfilesRoute() {
  const { profile: userProfile, session, openAuthentication } = useAuth();
  const { profiles, isLoading, error, createProfile, updateProfile, deleteProfile } =
    useAgriculturalProfiles();
  const { viewHistoryItem } = useHistory();
  const [view, setView] = useState<View>({ type: 'list' });
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selected = 'id' in view ? profiles.find((profile) => profile.id === view.id) : undefined;
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const visibleProfiles = profiles.filter((profile) =>
    profile.name.toLocaleLowerCase('vi-VN').includes(query),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Moving between views must focus the new heading.
  useEffect(() => {
    headingRef.current?.focus();
  }, [view.type]);

  const changeView = (next: View) => {
    setActionError(null);
    setNotice('');
    setView(next);
  };
  const submitCreate = async (input: AgriculturalProfileInput) => {
    setActionError(null);
    try {
      const created = await createProfile(input);
      setView({ type: 'detail', id: created.id });
      setNotice('Đã tạo hồ sơ.');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể tạo hồ sơ.');
    }
  };
  const submitUpdate = async (input: AgriculturalProfileInput) => {
    if (!selected) return;
    setActionError(null);
    try {
      await updateProfile(selected.id, input);
      setView({ type: 'detail', id: selected.id });
      setNotice('Đã cập nhật hồ sơ.');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể cập nhật hồ sơ.');
    }
  };
  const confirmDelete = async () => {
    if (!selected || isLoading) return;
    setActionError(null);
    try {
      await deleteProfile(selected.id);
      setSearch('');
      setView({ type: 'list' });
      setNotice('Đã xóa hồ sơ. Lịch sử chẩn đoán vẫn được giữ.');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể xóa hồ sơ.');
    }
  };

  if (!session)
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-16 text-center sm:px-8">
        <Leaf className="size-12 text-primary" aria-hidden="true" />
        <h1 className="mt-6 text-3xl font-bold">Hồ sơ nông nghiệp</h1>
        <p className="mt-3 text-muted-foreground">
          Đăng nhập để tạo và theo dõi từng khu vực canh tác của bạn.
        </p>
        <Button className="mt-6" onClick={() => openAuthentication('login')}>
          Đăng nhập / Đăng ký
        </Button>
      </div>
    );

  const title =
    view.type === 'create'
      ? 'Tạo hồ sơ'
      : view.type === 'edit'
        ? 'Chỉnh sửa hồ sơ'
        : view.type === 'delete'
          ? 'Xác nhận xóa hồ sơ'
          : view.type === 'detail'
            ? (selected?.name ?? 'Không tìm thấy hồ sơ')
            : profiles.length === 0 && !isLoading && !error
              ? 'Chưa có hồ sơ'
              : 'Hồ sơ nông nghiệp';
  const subtitle =
    view.type === 'create'
      ? 'Đặt tên dễ nhớ cho khu vườn hoặc khu canh tác của bạn.'
      : view.type === 'edit'
        ? 'Cập nhật ghi chú canh tác; lịch sử chẩn đoán được giữ nguyên.'
        : view.type === 'delete'
          ? 'Lịch sử chẩn đoán vẫn thuộc tài khoản của bạn sau khi xóa hồ sơ.'
          : view.type === 'detail' && selected
            ? `Hồ sơ của bạn · Tạo ${new Date(selected.createdAt).toLocaleDateString('vi-VN')} · Cập nhật ${new Date(selected.updatedAt ?? selected.createdAt).toLocaleDateString('vi-VN')}`
            : 'Theo dõi thông tin canh tác và lịch sử theo từng hồ sơ của bạn.';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="flex flex-col gap-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="break-words text-3xl font-bold leading-normal text-foreground outline-none"
        >
          {title}
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
      </header>
      {(error || actionError) && (
        <div role="alert" className="flex flex-wrap items-center gap-4 text-sm text-destructive">
          <p>{actionError ?? error}</p>
          {error && !actionError && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}

      {view.type === 'list' && (
        <section aria-labelledby="agricultural-profile-list-title" className="flex flex-col gap-6">
          <h2 id="agricultural-profile-list-title" className="sr-only">
            Danh sách hồ sơ của bạn
          </h2>
          {profiles.length > 0 && (
            <>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex w-full flex-col gap-2 sm:max-w-3xl">
                  <Label htmlFor="profile-search">Tìm hồ sơ</Label>
                  <Input
                    id="profile-search"
                    type="search"
                    placeholder="Nhập tên hồ sơ"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-13 rounded-xl border-border px-3.5"
                  />
                </div>
                <Button className="w-fit px-6" onClick={() => changeView({ type: 'create' })}>
                  Tạo hồ sơ
                </Button>
              </div>
              <p className="text-sm font-semibold" aria-live="polite">
                {visibleProfiles.length} hồ sơ của bạn
              </p>
            </>
          )}
          {isLoading && profiles.length === 0 && (
            <p role="status" aria-busy="true" className="py-8 text-muted-foreground">
              Đang tải hồ sơ…
            </p>
          )}
          {!isLoading && !error && profiles.length === 0 && (
            <Card className="rounded-card py-6 ring-0">
              <CardHeader className="px-6">
                <CardTitle>
                  <h3 className="text-2xl font-bold">Mỗi khu canh tác, một nơi theo dõi</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 px-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Tạo hồ sơ, ghi chú canh tác và chọn hồ sơ khi chẩn đoán để xem lại kết quả dễ dàng
                  hơn.
                </p>
                <Button className="w-fit px-6" onClick={() => changeView({ type: 'create' })}>
                  Tạo hồ sơ đầu tiên
                </Button>
              </CardContent>
            </Card>
          )}
          {profiles.length > 0 && (
            <Card className="rounded-card py-6 ring-0">
              <CardContent className="px-6">
                {visibleProfiles.length > 0 ? (
                  <ul>
                    {visibleProfiles.map((profile) => (
                      <li key={profile.id} className="border-b border-border py-5 first:pt-0">
                        <AgriculturalProfileCard
                          profile={profile}
                          onView={() => changeView({ type: 'detail', id: profile.id })}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-start gap-5">
                    <h3 className="text-xl font-bold">Không có kết quả tìm kiếm</h3>
                    <p className="text-sm text-muted-foreground">
                      Thử tên khác hoặc xóa nội dung tìm kiếm.
                    </p>
                    <Button variant="outline" onClick={() => setSearch('')}>
                      Xóa tìm kiếm
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Chỉ hiển thị hồ sơ của tài khoản đang đăng nhập.
          </p>
        </section>
      )}

      {(view.type === 'create' || (view.type === 'edit' && selected)) && (
        <Card className="rounded-card py-6 ring-0">
          <CardContent className="px-6">
            <AgriculturalProfileForm
              key={`${view.type}-${selected?.id ?? 'new'}`}
              profile={view.type === 'edit' ? selected : undefined}
              ownerName={userProfile.name}
              isSubmitting={isLoading}
              onSubmit={view.type === 'create' ? submitCreate : submitUpdate}
              onCancel={() =>
                changeView(
                  view.type === 'edit' && selected
                    ? { type: 'detail', id: selected.id }
                    : { type: 'list' },
                )
              }
            />
          </CardContent>
        </Card>
      )}

      {view.type === 'detail' && selected && (
        <>
          <Card className="rounded-card py-6 ring-0">
            <CardHeader className="px-6">
              <CardTitle>
                <h2 className="text-xl font-bold">Thông tin canh tác</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-6">
              <p className="whitespace-pre-line break-words leading-6">
                {selected.description || 'Chưa có ghi chú canh tác.'}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Cây trồng lấy từ từng kết quả chẩn đoán.
              </p>
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap">
                <Button asChild className="px-6">
                  <Link href={`/diagnose?profile=${encodeURIComponent(selected.id)}`}>
                    Chẩn đoán với hồ sơ này
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-border px-6"
                  onClick={() => changeView({ type: 'edit', id: selected.id })}
                >
                  Chỉnh sửa
                </Button>
                <Button
                  variant="outline"
                  className="border-border px-6"
                  onClick={() => changeView({ type: 'delete', id: selected.id })}
                >
                  Xóa hồ sơ
                </Button>
              </div>
            </CardContent>
          </Card>
          <AgriculturalProfileHistory
            key={selected.id}
            profileId={selected.id}
            token={session.token}
            onView={viewHistoryItem}
          />
          <Button
            variant="link"
            className="w-fit px-0"
            onClick={() => changeView({ type: 'list' })}
          >
            Quay về danh sách
          </Button>
        </>
      )}

      {view.type === 'delete' && selected && (
        <Card className="rounded-card py-6 ring-0">
          <CardHeader className="px-6">
            <CardTitle>
              <h2 className="break-words text-2xl font-bold">Xóa “{selected.name}”?</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-6">
            <p className="text-destructive">Không thể khôi phục hồ sơ sau khi xóa.</p>
            <Separator />
            <h3 className="text-xl font-bold">Lịch sử chẩn đoán vẫn được giữ</h3>
            <p className="leading-6">
              Các kết quả vẫn thuộc tài khoản của bạn và xuất hiện trong Lịch sử, nhưng không còn
              gắn với hồ sơ này.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Ảnh tiếp tục theo thời hạn lưu hiện tại. Xóa hồ sơ không xóa ngay hoặc gia hạn thời
              gian lưu ảnh.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={() => changeView({ type: 'detail', id: selected.id })}
              >
                Giữ hồ sơ
              </Button>
              <Button
                variant="destructive"
                className="bg-destructive text-primary-foreground hover:bg-destructive/90"
                disabled={isLoading}
                onClick={() => void confirmDelete()}
              >
                {isLoading ? 'Đang xóa…' : 'Xóa hồ sơ'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {'id' in view && !selected && (
        <Card className="rounded-card py-6 ring-0">
          <CardContent className="flex flex-col items-start gap-5 px-6">
            <h2 className="text-2xl font-bold">Hồ sơ không tồn tại hoặc không thể truy cập</h2>
            <p className="text-muted-foreground">
              Kiểm tra đường dẫn hoặc quay về danh sách hồ sơ của bạn.
            </p>
            <Button onClick={() => changeView({ type: 'list' })}>Về danh sách hồ sơ</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
