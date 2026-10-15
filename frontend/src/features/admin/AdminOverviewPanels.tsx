import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ImageOff, ShieldCheck, Monitor } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAdminPage, type AdminImage, type AdminSession } from '@/services/adminApi';
import type { AuthUser } from '@/services/authApi';
import { formatAdminDate } from './AdminRecordList';

function useRecentRecords<T>(resource: 'images' | 'sessions', token: string) {
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => ({ resource, token, attempt }), [resource, token, attempt]);
  const [state, setState] = useState<{ items?: T[]; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    getAdminPage<T>(request.resource, request.token, 1, '', controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) setState({ items: page.items.slice(0, 3) });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ error: 'Chưa thể tải dữ liệu gần đây.' });
      });
    return () => controller.abort();
  }, [request]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}

function RecentState({
  items,
  error,
  retry,
}: {
  items?: unknown[];
  error?: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button variant="outline" onClick={retry}>
          Thử tải lại
        </Button>
      </div>
    );
  return (
    <p role="status" className="py-5 text-sm text-muted-foreground">
      {items ? 'Chưa có bản ghi.' : 'Đang tải dữ liệu...'}
    </p>
  );
}

function RecentImage({ image }: { image: AdminImage }) {
  const [failed, setFailed] = useState(false);
  const url =
    image.imageUrl &&
    (/^https?:\/\//i.test(image.imageUrl) || image.imageUrl.startsWith('/uploads/'))
      ? image.imageUrl
      : null;
  return (
    <div className="min-w-0">
      <div className="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-media bg-surface-muted">
        {url && !failed ? (
          <Image
            src={url}
            alt={`Ảnh tải lên của ${image.userName}`}
            width={320}
            height={180}
            className="size-full object-cover"
            unoptimized
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-3 text-center text-xs text-muted-foreground">
            <ImageOff className="size-5" aria-hidden="true" />
            <span>
              {image.status === 'Expired'
                ? 'Ảnh đã hết hạn'
                : image.status === 'Deleted'
                  ? 'Ảnh đã được xóa'
                  : 'Không thể hiển thị ảnh'}
            </span>
          </div>
        )}
      </div>
      <p className="truncate text-sm font-medium" title={image.userName}>
        {image.userName}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {formatAdminDate(image.uploadedAt)}
      </p>
    </div>
  );
}

export function AdminRecentImages({ token, onImages }: { token: string; onImages: () => void }) {
  const state = useRecentRecords<AdminImage>('images', token);
  return (
    <section aria-label="Ảnh gần đây" data-admin-enter>
      <Card className="admin-panel h-full">
        <CardHeader>
          <CardTitle>
            <h2>Ảnh gần đây</h2>
          </CardTitle>
          <CardDescription>Những ảnh mới nhất trong hệ thống.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.items?.length ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {state.items.map((image) => (
                <RecentImage key={image.id} image={image} />
              ))}
            </div>
          ) : (
            <RecentState {...state} />
          )}
        </CardContent>
        <CardFooter className="admin-panel-footer">
          <Button variant="ghost" onClick={onImages}>
            Mở danh sách ảnh
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

export function AdminRecentSessions({
  token,
  onSessions,
}: {
  token: string;
  onSessions: () => void;
}) {
  const state = useRecentRecords<AdminSession>('sessions', token);
  return (
    <section aria-label="Phiên gần đây" data-admin-enter>
      <Card className="admin-panel">
        <CardHeader>
          <CardTitle>
            <h2>Phiên gần đây</h2>
          </CardTitle>
          <CardDescription>Ba phiên đăng nhập mới nhất.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.items?.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {state.items.map((session) => (
                <li key={session.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Monitor className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={session.userName}>
                      {session.userName}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {formatAdminDate(session.createdAt)}
                    </p>
                    <Badge
                      variant={session.status === 'Active' ? 'secondary' : 'outline'}
                      className="mt-2"
                    >
                      {session.status === 'Active'
                        ? 'Còn hiệu lực'
                        : session.status === 'Ended'
                          ? 'Đã đăng xuất'
                          : 'Hết hạn'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <RecentState {...state} />
          )}
        </CardContent>
        <CardFooter className="admin-panel-footer">
          <Button variant="ghost" onClick={onSessions}>
            Xem các phiên
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}

export function AdminAccountCard({ user }: { user: AuthUser }) {
  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <section aria-label="Tài khoản quản trị" data-admin-enter>
      <Card className="admin-panel admin-account-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials}
            </span>
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          </div>
          <CardDescription>Tài khoản đang đăng nhập</CardDescription>
          <CardTitle className="break-words text-lg">{user.fullName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="break-all text-xs leading-5 text-muted-foreground">{user.email}</p>
          <Badge variant="secondary" className="mt-2">
            Quản trị viên
          </Badge>
        </CardContent>
      </Card>
    </section>
  );
}
