import React, { useState } from 'react';
import { Bell, Leaf, Menu, X } from 'lucide-react';
import { NavigationTab, UserProfile } from '../../types';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  userProfile: UserProfile;
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

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, unreadNotificationsCount, onOpenNotifications, userProfile }) => {
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
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <button type="button" onClick={() => navigate('home')} className="group flex shrink-0 items-center gap-3 text-left transition-all" aria-label="LeafAI, về trang chủ">
            <span className="relative flex h-14 w-14 items-center justify-center overflow-visible drop-shadow-[0_4px_8px_rgba(36,92,58,0.2)] transition-transform duration-300 group-hover:scale-105">
              <img src="/images/logo.png" alt="LeafAI Logo" className="h-full w-full object-contain" style={{ filter: 'url(#remove-black)' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <Leaf className="hidden h-7 w-7 text-[#245c3a]" />
            </span>
            <span className="flex flex-col justify-center">
               <strong className="block text-[22px] font-black leading-none tracking-tight text-[#173e2a]">Leaf<span className="text-[#52814d]">AI</span></strong>
               <span className="mt-1 block text-[9px] font-bold tracking-[0.2em] text-[#6c866b]">VÌ CÂY TRỒNG VIỆT</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Điều hướng chính">
            {navItems.map((item) => (
              <button key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={selected === item.id ? 'page' : undefined} className={`rounded-full px-3.5 py-2.5 text-sm font-semibold transition-colors duration-300 ${selected === item.id ? 'bg-[#e7f1e2] text-[#245c3a]' : 'text-[#526753] hover:bg-[#f0f5eb] hover:text-[#245c3a]'}`}>{item.label}</button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onOpenNotifications} aria-label="Thông báo" className="relative hidden rounded-xl p-2.5 text-[#48654f] hover:bg-[#edf3e8] sm:block"><Bell className="h-5 w-5" />{unreadNotificationsCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d97c42]" />}</button>
            <button type="button" onClick={() => navigate('profile')} aria-label="Hồ sơ dùng thử" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#bed2b8] bg-[#e8f0e4] text-sm font-bold text-[#245c3a]">{userProfile.name.slice(0, 1).toUpperCase()}</button>
            <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={menuOpen} className="rounded-xl p-2 text-[#245c3a] hover:bg-[#edf3e8] lg:hidden">{menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          </div>
        </div>
        {menuOpen && <nav aria-label="Điều hướng mở rộng" className="grid grid-cols-2 gap-2 border-t border-[#e3ebdf] bg-[#fffdf7] px-5 py-4 lg:hidden">{navItems.map((item) => <button key={item.id} type="button" onClick={() => navigate(item.id)} className={`rounded-xl px-3 py-3 text-left text-sm font-semibold ${selected === item.id ? 'bg-[#e8f0e4] text-[#245c3a]' : 'text-[#526753]'}`}>{item.label}</button>)}</nav>}
      </header>
    </>
  );
};
