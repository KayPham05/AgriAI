'use client';

import type React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import { PrivateImage } from '@/components/common/PrivateImage';
import Link from 'next/link';
import { getTabPath } from '@/lib/appRoutes';
import { Bell, Leaf, LogIn, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavigationTab, UserProfile } from '../../types';

interface NavbarProps {
  currentTab: NavigationTab;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  userProfile: UserProfile;
  isAuthenticated: boolean;
  onOpenLogin: () => void;
}

const navItems: Array<{ id: NavigationTab; label: string }> = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'diagnose', label: 'Kiểm tra lá' },
  { id: 'plants', label: 'Cây trồng' },
  { id: 'diseases', label: 'Bệnh thường gặp' },
  { id: 'history', label: 'Mẫu đã lưu' },
  { id: 'about', label: 'Về dự án' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  unreadNotificationsCount,
  onOpenNotifications,
  userProfile,
  isAuthenticated,
  onOpenLogin,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const selected =
    currentTab === 'plant-detail'
      ? 'plants'
      : currentTab === 'disease-detail'
        ? 'diseases'
        : currentTab;

  return (
    <header className="sticky top-0 z-40 px-5 py-3 sm:px-8 lg:px-12">
      <div className="navigation-bar mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 rounded-card border border-border bg-surface px-3 sm:px-5">
        <Button asChild variant="ghost" className="h-auto gap-3 px-0 hover:bg-transparent">
          <Link href="/home" aria-label="AgriAI, về trang chủ">
            <span className="grid h-11 w-8 shrink-0 place-items-center">
              <Image
                src="/images/agriai-leaf-mark.png"
                width={44}
                height={44}
                alt="Logo AgriAI"
                className="size-full object-contain"
                onError={(event) => {
                  event.currentTarget.hidden = true;
                  event.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Leaf className="hidden size-6 text-primary" aria-hidden="true" />
            </span>
            <span className="text-left">
              <strong className="block text-lg font-extrabold leading-none text-foreground">
                AgriAI
              </strong>
              <span className="mt-1 hidden text-xs font-medium text-muted-foreground sm:block">
                Vì cây trồng Việt
              </span>
            </span>
          </Link>
        </Button>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <Button
              key={item.id}
              asChild
              variant={selected === item.id ? 'secondary' : 'ghost'}
              aria-current={selected === item.id ? 'page' : undefined}
              className="h-11 rounded-lg px-3"
            >
              <Link href={getTabPath(item.id)}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenNotifications}
            aria-label={
              unreadNotificationsCount > 0
                ? `Thông báo, ${unreadNotificationsCount} chưa đọc`
                : 'Thông báo'
            }
            className="relative hidden sm:inline-flex"
          >
            <Bell aria-hidden="true" />
            {unreadNotificationsCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-0 top-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground"
              >
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </Button>
          {isAuthenticated ? (
            <Button asChild variant="secondary" size="icon">
              <Link href="/profile" aria-label={`Mở hồ sơ của ${userProfile.name}`}>
                {userProfile.avatarUrl ? (
                  <PrivateImage
                    src={userProfile.avatarUrl}
                    width={44}
                    height={44}
                    alt="Ảnh đại diện tài khoản"
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  userProfile.name.slice(0, 1).toUpperCase()
                )}
              </Link>
            </Button>
          ) : (
            <Button type="button" onClick={onOpenLogin} className="hidden sm:inline-flex">
              <LogIn data-icon="inline-start" />
              Đăng nhập
            </Button>
          )}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="xl:hidden"
                aria-label="Mở menu"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(88vw,22rem)] bg-surface p-5">
              <SheetHeader className="text-left">
                <SheetTitle>Điều hướng AgriAI</SheetTitle>
                <SheetDescription>Chọn khu vực bạn muốn mở.</SheetDescription>
              </SheetHeader>
              <nav className="mt-6 grid gap-2" aria-label="Điều hướng trên điện thoại">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    asChild
                    variant={selected === item.id ? 'secondary' : 'ghost'}
                    aria-current={selected === item.id ? 'page' : undefined}
                    className="w-full justify-start rounded-lg"
                  >
                    <Link href={getTabPath(item.id)} onClick={() => setMenuOpen(false)}>
                      {item.label}
                    </Link>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start sm:hidden"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenNotifications();
                  }}
                >
                  Thông báo{unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount})` : ''}
                </Button>
                {!isAuthenticated && (
                  <Button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenLogin();
                    }}
                    className="mt-3 w-full"
                  >
                    Đăng nhập hoặc đăng ký
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
