'use client';
import { useCallback, useRef, useState } from 'react';
import { AdminMockProvider } from './AdminMockProvider';
import { clearAuthSession, revokeSession, type AuthSession } from '@/services/authApi';
import { useRouter } from 'next/navigation';
import { AdminAccess } from './AdminAccess';
import { AdminLoginSuccessScreen } from './AdminLoginSuccessScreen';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Images,
  Monitor,
  LogOut,
  Menu,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
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
import dynamic from 'next/dynamic';
import { BookOpen, Leaf, Pill, Link2, Bug } from 'lucide-react';
const KnowledgeAdmin = dynamic(() =>
  import('@/features/knowledge/KnowledgeAdmin').then((module) => module.KnowledgeAdmin),
);
const PlantDiseaseManager = dynamic(() =>
  import('@/features/knowledge/PlantDiseaseManager').then((module) => module.PlantDiseaseManager),
);

type CrmView =
  | 'overview'
  | 'users'
  | 'images'
  | 'sessions'
  | 'plants'
  | 'diseases'
  | 'medicines'
  | 'knowledge-documents'
  | 'plant-diseases';
const NAVIGATION = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'images', label: 'Ảnh đã tải lên', icon: Images },
  { id: 'sessions', label: 'Phiên đăng nhập', icon: Monitor },
  { id: 'plants', label: 'Cây trồng', icon: Leaf },
  { id: 'diseases', label: 'Bệnh cây', icon: Bug },
  { id: 'medicines', label: 'Thuốc', icon: Pill },
  { id: 'knowledge-documents', label: 'Bài viết', icon: BookOpen },
  { id: 'plant-diseases', label: 'Liên kết cây và bệnh', icon: Link2 },
] as const;
const VIEW_COPY = {
  plants: { title: 'Quản lý cây trồng' },
  diseases: { title: 'Quản lý bệnh cây' },
  medicines: { title: 'Quản lý thuốc' },
  'knowledge-documents': { title: 'Quản lý bài viết' },
  'plant-diseases': { title: 'Liên kết cây và bệnh' },
  overview: {
    title: 'Tổng quan vận hành',
  },
  users: {
    title: 'Người dùng',
  },
  images: {
    title: 'Ảnh đã tải lên',
  },
  sessions: {
    title: 'Phiên đăng nhập',
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
  const { rootRef, railOpen, toggleRail } = useAdminRail();
  const [loggingOut, setLoggingOut] = useState(false);
  const finishLogout = useCallback(() => router.replace('/'), [router]);
  const logoutPending = useRef(false);
  const [logoutError, setLogoutError] = useState('');
  async function logout() {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setLogoutError('');
    try {
      await revokeSession(session.token);
      clearAuthSession();
      setLoggingOut(true);
    } catch {
      setLogoutError('Chưa thể thu hồi phiên. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      logoutPending.current = false;
    }
  }
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
  if (loggingOut) {
    return (
      <AdminLoginSuccessScreen
        mode="logout"
        userName={session.user.fullName}
        onAnimationComplete={finishLogout}
      />
    );
  }
  return (
    <div className="admin-dashboard h-dvh overflow-hidden bg-surface-muted p-0 text-foreground sm:p-4 lg:p-6">
      {logoutError && <p role="alert">{logoutError}</p>}
      <a className="skip-link" href="#admin-main">
        Đến nội dung quản trị
      </a>
      <div
        ref={rootRef}
        data-rail-open={railOpen}
        className="admin-workspace mx-auto flex h-full min-h-0 max-w-screen-2xl items-start"
      >
        <div className="admin-rail-slot sticky top-6 hidden shrink-0 lg:block">
          <aside
            id="admin-desktop-navigation"
            aria-label="Thanh điều hướng quản trị"
            className="admin-rail relative isolate flex flex-col rounded-2xl px-3 py-6"
          >
            <span data-admin-rail-surface className="admin-rail-surface" aria-hidden="true" />
            <div className="admin-rail-content flex h-full min-h-0 flex-col overflow-y-auto">
              <Link
                href="/admin"
                aria-label="AgriAI, về trang tổng quan"
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  event.preventDefault();
                  navigate('overview');
                }}
                className="mb-10 flex min-h-11 items-center gap-3"
              >
                <Image
                  src="/images/agriai-leaf-mark.png"
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 object-contain"
                />
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
        <div
          data-admin-content
          className="admin-frame flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background"
        >
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
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                aria-label={railOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
                title={railOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
                aria-controls="admin-desktop-navigation"
                aria-expanded={railOpen}
                onClick={toggleRail}
              >
                {railOpen ? (
                  <PanelLeftClose aria-hidden="true" />
                ) : (
                  <PanelLeftOpen aria-hidden="true" />
                )}
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
          <main id="admin-main" className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6">
            <div className="mb-2 flex shrink-0 flex-col gap-1">
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {VIEW_COPY[view].title}
              </h1>
            </div>
            <AdminMotion view={view}>
              {view === 'overview' && (
                <AdminOverview
                  onImages={() => navigate('images')}
                  onUsers={() => navigate('users')}
                  onSessions={() => navigate('sessions')}
                />
              )}
              {view === 'users' && <AdminUsers key={userSearch} initialQuery={userSearch} />}
              {view === 'images' && <AdminImages />}
              {view === 'sessions' && <AdminSessions />}
              {(view === 'plants' ||
                view === 'diseases' ||
                view === 'medicines' ||
                view === 'knowledge-documents') && (
                <KnowledgeAdmin key={view} kind={view} token={session.token} />
              )}
              {view === 'plant-diseases' && <PlantDiseaseManager token={session.token} />}
            </AdminMotion>
            {view !== 'overview' && (
              <footer className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
                <p>AgriAI Quản trị</p>
                <p>
                  Nguồn dữ liệu:{' '}
                  {['users', 'images', 'sessions'].includes(view) ? 'Mock frontend' : 'API AgriAI'}
                </p>
              </footer>
            )}
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
