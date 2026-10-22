'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewEntrance } from '@/components/common/ViewEntrance';
import { Navbar } from './Navbar';
import { MobileNavigation } from './MobileNavigation';
import { getAppRoute } from '@/lib/appRoutes';
import { useAuth, useFeedback } from '@/providers/AppContexts';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tab } = getAppRoute(pathname);
  const { profile, session, openAuthentication } = useAuth();
  const { notifications, openNotifications } = useFeedback();
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] font-sans text-foreground md:pb-0">
      <div className="relative z-10 flex min-h-screen flex-col">
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        <Navbar
          currentTab={tab}
          unreadNotificationsCount={notifications.filter((item) => !item.read).length}
          onOpenNotifications={openNotifications}
          userProfile={profile}
          isAuthenticated={Boolean(session)}
          onOpenLogin={() => openAuthentication('login')}
        />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <ViewEntrance key={pathname}>{children}</ViewEntrance>
        </main>
        <footer className="mt-10 border-t border-border bg-surface">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
            <p className="text-sm font-semibold text-primary">AgriAI · Vì cây trồng Việt</p>
            <Button asChild variant="link" className="self-start px-0">
              <Link href="/about">
                Về dự án <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </footer>
        <MobileNavigation currentTab={tab} />
      </div>
    </div>
  );
}
