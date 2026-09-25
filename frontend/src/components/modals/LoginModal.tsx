import React from 'react';
import { User, X } from 'lucide-react';
import { UserProfile } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  if (!isOpen) return null;

  const useDemoProfile = () => {
    onLoginSuccess({
      name: 'Khách dùng thử',
      email: '',
      avatarUrl: '',
      role: 'Hồ sơ trên thiết bị',
      location: 'Chưa thiết lập',
      joinedDate: 'Bản demo',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="presentation">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="demo-profile-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><User className="h-5 w-5" /></span>
            <h2 id="demo-profile-title" className="font-display text-lg font-bold text-[#17211B]">Hồ sơ dùng thử</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-[#647067] hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#47554B]">
          Tài khoản và đăng nhập chưa được kết nối. Bạn có thể xem giao diện hồ sơ mẫu; lịch sử mẫu chỉ được lưu trong trình duyệt này.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={useDemoProfile} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">Xem hồ sơ mẫu</button>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E2E8E4] px-4 py-3 text-sm font-semibold text-[#17211B] hover:bg-[#F8FAF9]">Để sau</button>
        </div>
      </div>
    </div>
  );
};
