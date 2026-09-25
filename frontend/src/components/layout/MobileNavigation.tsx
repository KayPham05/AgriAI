import React from 'react';
import { BookOpen, Camera, Home, Leaf, History, User } from 'lucide-react';
import { NavigationTab } from '../../types';

interface MobileNavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

const items = [
  { id: 'home' as NavigationTab, label: 'Trang chủ', icon: Home },
  { id: 'plants' as NavigationTab, label: 'Cây trồng', icon: Leaf },
  { id: 'diagnose' as NavigationTab, label: 'Chụp lá', icon: Camera },
  { id: 'history' as NavigationTab, label: 'Đã lưu', icon: History },
  { id: 'profile' as NavigationTab, label: 'Hồ sơ', icon: User },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ currentTab, onSelectTab }) => {
  const selected = currentTab === 'plant-detail' ? 'plants' : currentTab === 'disease-detail' ? 'plants' : currentTab;
  return (
    <nav aria-label="Điều hướng điện thoại" className="fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border-t border-[#e0eadb] bg-[#fffef9]/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_34px_rgba(30,66,36,.07)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => {
          const active = selected === id;
          return <button key={id} type="button" onClick={() => onSelectTab(id)} aria-current={active ? 'page' : undefined} className={`flex min-h-[66px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${active ? 'text-[#245c3a]' : 'text-[#6d806d]'}`}>
            <span className={`flex h-8 w-10 items-center justify-center rounded-full ${active ? 'bg-[#e5f0df]' : ''}`}><Icon className="h-5 w-5" /></span><span>{label}</span>
          </button>;
        })}
      </div>
    </nav>
  );
};
