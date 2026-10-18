import type React from 'react';
import Link from 'next/link';
import { getTabPath } from '@/lib/appRoutes';
import { Camera, Home, Leaf, History, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NavigationTab } from '../../types';

interface MobileNavigationProps {
  currentTab: NavigationTab;
}

const items = [
  { id: 'home' as NavigationTab, label: 'Trang chủ', icon: Home },
  { id: 'plants' as NavigationTab, label: 'Cây trồng', icon: Leaf },
  { id: 'diagnose' as NavigationTab, label: 'Chụp lá', icon: Camera },
  { id: 'history' as NavigationTab, label: 'Đã lưu', icon: History },
  { id: 'profile' as NavigationTab, label: 'Hồ sơ', icon: User },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ currentTab }) => {
  const selected =
    currentTab === 'plant-detail'
      ? 'plants'
      : currentTab === 'disease-detail'
        ? 'plants'
        : currentTab;
  return (
    <nav
      aria-label="Điều hướng điện thoại"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => {
          const active = selected === id;
          return (
            <Button
              key={id}
              asChild
              variant="ghost"
              aria-current={active ? 'page' : undefined}
              className={`h-16 flex-1 flex-col gap-1 rounded-xl px-1 text-xs ${active ? 'bg-secondary text-primary' : 'text-muted-foreground'}`}
            >
              <Link href={getTabPath(id)}>
                <Icon className="size-5" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
