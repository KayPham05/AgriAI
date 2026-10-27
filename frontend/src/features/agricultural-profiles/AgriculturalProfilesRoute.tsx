'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Leaf, Plus, Sprout, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useAgriculturalProfiles, useAuth } from '@/providers/AppContexts';
import type { AgriculturalProfile, AgriculturalProfileInput } from '@/services/agriculturalProfileApi';
import { AgriculturalProfileCard } from '@/components/agricultural-profile/AgriculturalProfileCard';
import { AgriculturalProfileForm } from '@/components/agricultural-profile/AgriculturalProfileForm';

type View = { type: 'list' } | { type: 'create' } | { type: 'detail'; id: string } | { type: 'edit'; id: string };

export function AgriculturalProfilesRoute() {
  const { profile: userProfile, session, openAuthentication } = useAuth();
  const {
    profiles,
    isLoading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useAgriculturalProfiles();
  const [view, setView] = useState<View>({ type: 'list' });
  const [deleteTarget, setDeleteTarget] = useState<AgriculturalProfile | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const selected = useMemo(
    () => ('id' in view ? profiles.find((profile) => profile.id === view.id) ?? null : null),
    [profiles, view],
  );

  if (!session) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-16 text-center sm:px-8">
        <div className="grid size-16 place-items-center rounded-full bg-secondary text-primary">
          <Leaf className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-foreground">Hồ sơ nông nghiệp</h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Đăng nhập để tạo và theo dõi từng khu vực canh tác của bạn.
        </p>
        <Button className="mt-6" onClick={() => openAuthentication('login')}>
          Đăng nhập / Đăng ký
        </Button>
      </div>
    );
  }

  const submitCreate = async (input: AgriculturalProfileInput) => {
    setActionError(null);
    try {
      const created = await createProfile(input);
      setView({ type: 'detail', id: created.id });
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
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể cập nhật hồ sơ.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteProfile(deleteTarget.id);
      setDeleteTarget(null);
      setView({ type: 'list' });
    } catch (cause) {
      setDeleteTarget(null);
      setActionError(cause instanceof Error ? cause.message : 'Không thể xóa hồ sơ.');
    }
  };

  const pageTitle = view.type === 'create' ? 'Tạo hồ sơ' : view.type === 'edit' ? 'Chỉnh sửa hồ sơ' : view.type === 'detail' ? selected?.name ?? 'Chi tiết hồ sơ' : 'Hồ sơ nông nghiệp';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">AGRI-116 / S3-03</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{pageTitle}</h1>
          <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">
            Tổ chức thông tin và theo dõi lịch sử chẩn đoán theo từng khu vực canh tác.
          </p>
        </div>
        {view.type === 'list' && (
          <Button onClick={() => { setActionError(null); setView({ type: 'create' }); }}>
            <Plus data-icon="inline-start" />
            Tạo hồ sơ
          </Button>
        )}
      </header>

      {(error || actionError) && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {actionError ?? error}
        </div>
      )}

      {view.type === 'list' && (
        <section aria-labelledby="agricultural-profile-list-title">
          <h2 id="agricultural-profile-list-title" className="sr-only">Danh sách hồ sơ của bạn</h2>
          {isLoading && profiles.length === 0 ? (
            <div aria-busy="true" role="status" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <span className="sr-only">Đang tải hồ sơ</span>
              {[0, 1, 2].map((item) => <div key={item} className="h-56 animate-pulse rounded-xl bg-surface-muted" />)}
            </div>
          ) : profiles.length === 0 ? (
            <Card className="border-dashed bg-surface">
              <CardContent className="flex flex-col items-center px-6 py-16 text-center">
                <Sprout className="size-12 text-primary" aria-hidden="true" />
                <h2 className="mt-5 text-xl font-bold">Bạn chưa có hồ sơ nào</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Tạo hồ sơ đầu tiên để lưu ghi chú canh tác và gắn các lần chẩn đoán vào đúng khu vực.
                </p>
                <Button className="mt-6" onClick={() => setView({ type: 'create' })}>
                  <Plus data-icon="inline-start" />
                  Tạo hồ sơ đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => (
                <li key={profile.id}>
                  <AgriculturalProfileCard
                    profile={profile}
                    onView={() => setView({ type: 'detail', id: profile.id })}
                    onEdit={() => setView({ type: 'edit', id: profile.id })}
                    onDelete={() => setDeleteTarget(profile)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(view.type === 'create' || view.type === 'edit') && (
        <Card className="mx-auto w-full max-w-3xl bg-surface">
          <CardContent className="p-6 sm:p-8">
            <AgriculturalProfileForm
              key={`${view.type}-${selected?.id ?? 'new'}`}
              profile={view.type === 'edit' ? selected ?? undefined : undefined}
              ownerName={userProfile.name}
              isSubmitting={isLoading}
              onSubmit={view.type === 'create' ? submitCreate : submitUpdate}
              onCancel={() => setView(view.type === 'edit' && selected ? { type: 'detail', id: selected.id } : { type: 'list' })}
            />
          </CardContent>
        </Card>
      )}

      {view.type === 'detail' && selected && (
        <Card className="mx-auto w-full max-w-3xl bg-surface">
          <CardContent className="p-6 sm:p-8">
            <Button variant="ghost" className="-ml-3 mb-6" onClick={() => setView({ type: 'list' })}>
              <ArrowLeft data-icon="inline-start" />
              Danh sách hồ sơ
            </Button>
            <div className="flex flex-col gap-6">
              <div className="rounded-lg bg-surface-muted p-5">
                <p className="text-sm text-muted-foreground">Chủ sở hữu</p>
                <p className="mt-1 font-semibold">{userProfile.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mô tả và thông tin canh tác</p>
                <p className="mt-2 whitespace-pre-line leading-7">{selected.description || 'Chưa có mô tả.'}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Lần chẩn đoán</p>
                  <p className="mt-1 text-2xl font-bold text-primary">{selected.predictionCount}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">Trạng thái hồ sơ</p>
                  <p className="mt-1 font-semibold text-primary">Đang theo dõi</p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setDeleteTarget(selected)}>
                  <Trash2 data-icon="inline-start" />
                  Xóa hồ sơ
                </Button>
                <Button onClick={() => setView({ type: 'edit', id: selected.id })}>
                  Chỉnh sửa hồ sơ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hồ sơ nông nghiệp?</AlertDialogTitle>
            <AlertDialogDescription>
              Lịch sử chẩn đoán của {deleteTarget?.name ?? 'hồ sơ này'} vẫn được giữ lại và bỏ liên kết với hồ sơ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>
              Xóa hồ sơ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
