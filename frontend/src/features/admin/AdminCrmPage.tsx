'use client';
import { useRef, useState } from 'react';
import { AdminMockProvider, useAdminMock } from './AdminMockProvider';
import { clearAuthSession, type AuthSession } from '@/services/authApi';
import { useRouter } from 'next/navigation';
import { AdminAccess } from './AdminAccess';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, Users, Images, Monitor, LogOut, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminMotion } from './AdminMotion';
import { useAdminRail } from './useAdminRail';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AdminOverview } from './AdminOverview';
import { AdminUsers } from './AdminUsers';
import { AdminImages } from './AdminImages';
import { AdminSessions } from './AdminSessions';

type CrmView = 'overview' | 'users' | 'images' | 'sessions';
const NAVIGATION = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'images', label: 'Ảnh đã tải lên', icon: Images },
  { id: 'sessions', label: 'Phiên đăng nhập', icon: Monitor },
] as const;
const VIEW_COPY = {
  overview: {
    title: 'Tổng quan vận hành',
    description: 'Quản lý người dùng, ảnh đã tải lên và phiên đăng nhập AgriAI.',
  },
  users: {
    title: 'Người dùng',
    description: 'Thông tin tài khoản người dùng AgriAI.',
  },
  images: {
    title: 'Ảnh đã tải lên',
    description: 'Ảnh người dùng tải lên để kiểm tra lá cây.',
  },
  sessions: {
    title: 'Phiên đăng nhập',
    description: 'Phiên đăng nhập gắn với tài khoản người dùng.',
  },
};
function CrmNavigation({
  view,
  onChange,
  compact = false,
  expanded = true,
}: {
  view: CrmView;
  onChange: (view: CrmView) => void;
  compact?: boolean;
  expanded?: boolean;
}) {
  return (
    <nav aria-label="Điều hướng quản trị" className="flex flex-col gap-2">
      {NAVIGATION.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant={view === id ? 'default' : 'ghost'}
          aria-label={label}
          title={compact && !expanded ? label : undefined}
          aria-current={view === id ? 'page' : undefined}
          className={compact ? 'admin-rail-button w-full gap-3' : 'w-full justify-start'}
          onClick={() => onChange(id)}
        >
          <Icon data-icon="inline-start" />
          <span className={compact ? 'admin-rail-label' : undefined} hidden={compact && !expanded}>
            {label}
          </span>
        </Button>
      ))}
    </nav>
  );
}
export function AdminCrmPage() {
  return (
    <AdminAccess>
      {(session) => (
        <AdminMockProvider key={session.token}>
          <AdminWorkspace session={session} />
        </AdminMockProvider>
      )}
    </AdminAccess>
  );
}

function AdminWorkspace({ session }: { session: AuthSession }) {
  const router = useRouter();
  const { rootRef, railOpen, railHandlers } = useAdminRail();
  function logout() {
    clearAuthSession();
    router.replace('/');
  }
  const data = useAdminMock();
  const summary = {
    userCount: data.users.length,
    imageCount: data.images.length,
    sessionCount: data.sessions.length,
  };
  const [view, setView] = useState<CrmView>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [userSearch, setUserSearch] = useState('');
  function navigate(next: CrmView, query = '') {
    setUserSearch(next === 'users' ? query : '');
    setView(next);
    setMenuOpen(false);
    requestAnimationFrame(() => heading.current?.focus());
  }
  return (
    <div className="admin-dashboard min-h-dvh overflow-x-clip bg-surface-muted p-0 text-foreground sm:p-4 lg:p-6">
      <a className="skip-link" href="#admin-main">
        Đến nội dung quản trị
      </a>
      <div
        ref={rootRef}
        data-rail-open={railOpen}
        className="admin-workspace mx-auto flex max-w-screen-2xl items-start"
      >
        <div className="admin-rail-slot sticky top-6 hidden shrink-0 lg:block">
          <aside
            id="admin-desktop-navigation"
            {...railHandlers}
            aria-label="Thanh điều hướng quản trị"
            className="admin-rail relative isolate flex flex-col rounded-2xl px-3 py-6"
          >
            <span data-admin-rail-surface className="admin-rail-surface" aria-hidden="true" />
            <div className="admin-rail-content flex h-full min-h-0 flex-col overflow-y-auto">
              <Link
                href="/"
                aria-label="AgriAI, về trang giới thiệu"
                className="mb-10 flex min-h-11 items-center gap-3"
              >
                <Image src="/images/logo.png" alt="" width={40} height={40} />
                <span className="admin-rail-label text-sm font-bold" hidden={!railOpen}>
                  AgriAI
                </span>
              </Link>
              <CrmNavigation view={view} onChange={navigate} compact expanded={railOpen} />
              <Button
                variant="ghost"
                className="admin-rail-button mt-auto w-full gap-3"
                aria-label="Đăng xuất"
                title={!railOpen ? 'Đăng xuất' : undefined}
                onClick={logout}
              >
                <LogOut aria-hidden="true" />
                <span className="admin-rail-label" hidden={!railOpen}>
                  Đăng xuất
                </span>
              </Button>
            </div>
          </aside>
        </div>
        <div data-admin-content className="admin-frame min-h-dvh min-w-0 flex-1 bg-background">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Mở menu quản trị"
                onClick={() => setMenuOpen(true)}
              >
                <Menu />
              </Button>

              <div>
                <p className="text-sm font-semibold">Không gian quản trị</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AgriAI · Xin chào, {session.user.fullName}
                </p>
              </div>
            </div>
            <form
              className="admin-search flex w-full items-center gap-1 rounded-full bg-surface sm:w-auto"
              onSubmit={(event) => {
                event.preventDefault();
                navigate('users', searchDraft.trim());
              }}
            >
              <Label htmlFor="admin-global-search" className="sr-only">
                Tìm tài khoản theo tên hoặc email
              </Label>
              <Input
                id="admin-global-search"
                type="search"
                placeholder="Tìm tài khoản..."
                value={searchDraft}
                maxLength={150}
                onChange={(event) => setSearchDraft(event.target.value)}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 sm:w-56"
              />
              <Button type="submit" variant="ghost" size="icon" aria-label="Tìm tài khoản">
                <Search />
              </Button>
            </form>
          </header>
          <main id="admin-main" className="px-5 py-4 sm:px-6 sm:py-5">
            <div className="mb-5 flex flex-col gap-2">
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {VIEW_COPY[view].title}
              </h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {VIEW_COPY[view].description}
              </p>
            </div>
            <p role="note" className="mb-4 text-sm text-muted-foreground">
              Dữ liệu minh họa (mock). Thao tác chỉ mô phỏng trên giao diện, đặt lại khi tải lại
              trang.
            </p>
            <AdminMotion view={view}>
              {view === 'overview' && (
                <AdminOverview
                  summary={summary}
                  user={session.user}
                  onUsers={() => navigate('users')}
                  onImages={() => navigate('images')}
                  onSessions={() => navigate('sessions')}
                />
              )}
              {view === 'users' && <AdminUsers key={userSearch} initialQuery={userSearch} />}
              {view === 'images' && <AdminImages />}
              {view === 'sessions' && <AdminSessions />}
            </AdminMotion>
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
              <p>AgriAI Quản trị / Giao diện quản trị người dùng</p>
              <p>Nguồn dữ liệu: Mock frontend</p>
            </footer>
          </main>
        </div>
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="px-5">
          <SheetHeader>
            <SheetTitle>AgriAI Quản trị</SheetTitle>
            <SheetDescription>Điều hướng không gian quản trị.</SheetDescription>
          </SheetHeader>
          <CrmNavigation view={view} onChange={navigate} />
          <Button variant="outline" className="mt-4" onClick={logout}>
            Đăng xuất
            <LogOut data-icon="inline-end" />
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
