import React, { useState } from 'react';
import { Bell, Leaf, LogIn, Menu, X } from 'lucide-react';
import { NavigationTab, UserProfile } from '../../types';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
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

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, unreadNotificationsCount, onOpenNotifications, userProfile, isAuthenticated, onOpenLogin }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const selected = currentTab === 'plant-detail' ? 'plants' : currentTab === 'disease-detail' ? 'diseases' : currentTab;
  const navigate = (tab: NavigationTab) => { onSelectTab(tab); setMenuOpen(false); };

  return (
    <>
      {/* SVG Filter to dynamically remove the pure black background from the logo */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="remove-black" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  1.5 1.5 1.5 0 0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="3" intercept="-0.1" />
          </feComponentTransfer>
        </filter>
      </svg>

      <header className="sticky top-0 z-40 border-b border-[#e4ecdf] bg-[#fffef9]/92 shadow-[0_8px_32px_rgba(34,69,36,.045)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-[76px] sm:gap-5 sm:px-8 lg:px-12">
          <button type="button" onClick={() => navigate('home')} className="group flex shrink-0 items-center gap-3 text-left transition-all" aria-label="LeafAI, về trang chủ">
            <span className="relative flex h-11 w-11 items-center justify-center overflow-visible drop-shadow-[0_4px_8px_rgba(36,92,58,0.2)] transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14">
              <img src="/images/logo.png" alt="LeafAI Logo" className="h-full w-full object-contain" style={{ filter: 'url(#remove-black)' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <Leaf className="hidden h-7 w-7 text-[#245c3a]" />
            </span>
            <span className="flex flex-col justify-center">
               <strong className="block text-[22px] font-black leading-none tracking-tight text-[#173e2a]">Leaf<span className="text-[#52814d]">AI</span></strong>
               <span className="mt-1 hidden text-[9px] font-bold tracking-[0.2em] text-[#6c866b] min-[380px]:block">VÌ CÂY TRỒNG VIỆT</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
            {navItems.map((item) => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={selected === item.id ? 'page' : undefined} className={`rounded-full px-3.5 py-2.5 text-sm font-semibold transition-colors duration-300 ${selected === item.id ? 'bg-[#e7f1e2] text-[#245c3a]' : 'text-[#526753] hover:bg-[#f0f5eb] hover:text-[#245c3a]'}`}>{item.label}</button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onOpenNotifications} aria-label="Thông báo" className="relative hidden rounded-xl p-2.5 text-[#48654f] hover:bg-[#edf3e8] sm:block"><Bell className="h-5 w-5" />{unreadNotificationsCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d97c42]" />}</button>
            {isAuthenticated ? (
              <button type="button" onClick={() => navigate('profile')} aria-label={`Mở hồ sơ của ${userProfile.name}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#9fbd96] bg-[#e8f0e4] text-sm font-bold text-[#245c3a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#52814d]">{userProfile.name.slice(0, 1).toUpperCase()}</button>
            ) : (
              <button type="button" onClick={onOpenLogin} className="hidden items-center gap-2 rounded-xl bg-[#245c3a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4d30] sm:flex"><LogIn className="h-4 w-4" /> Đăng nhập</button>
            )}
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} className="rounded-xl p-2 text-[#245c3a] hover:bg-[#edf3e8] lg:hidden">{menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          </div>
        </div>
        {menuOpen && <nav aria-label="Điều hướng mở rộng" className="grid max-h-[calc(100dvh-8rem)] grid-cols-1 gap-2 overflow-y-auto border-t border-[#e3ebdf] bg-[#fffdf7] px-4 py-3 min-[380px]:grid-cols-2 sm:px-5 sm:py-4 lg:hidden">{navItems.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`rounded-xl px-3 py-3 text-left text-sm font-semibold ${selected === item.id ? 'bg-[#e8f0e4] text-[#245c3a]' : 'text-[#526753]'}`}>{item.label}</button>)}{!isAuthenticated && <button type="button" onClick={() => { setMenuOpen(false); onOpenLogin(); }} className="flex items-center justify-center gap-2 rounded-xl bg-[#245c3a] px-3 py-3 text-sm font-bold text-white min-[380px]:col-span-2"><LogIn className="h-4 w-4" /> Đăng nhập / Đăng ký</button>}</nav>}
      </header>
    </>
  );
};
