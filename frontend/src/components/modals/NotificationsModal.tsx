import React from 'react';
import { Bell, CheckCheck, X, Sparkles, Database, RefreshCw, AlertCircle } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center sm:justify-end p-4 sm:p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8E4] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-4 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="font-display font-bold text-base text-[#17211B]">Thông báo hệ thống</h3>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {notifications.filter(n => !n.read).length} mới
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 p-1 cursor-pointer"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đã đọc</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#647067] hover:text-[#17211B] rounded-lg cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Notifications */}
        <div className="divide-y divide-[#E2E8E4] overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 px-6 text-center text-[#647067]">
              <Bell className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
              <p className="text-sm font-medium">Không có thông báo nào</p>
              <p className="text-xs mt-1">Cập nhật và khuyến nghị dịch tễ sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            notifications.map((item) => {
              let Icon = Sparkles;
              let iconBg = 'bg-emerald-50 text-emerald-700';

              if (item.title.includes('Database') || item.title.includes('Dữ liệu')) {
                Icon = Database;
                iconBg = 'bg-blue-50 text-blue-700';
              } else if (item.title.includes('Update') || item.title.includes('Cập nhật')) {
                Icon = RefreshCw;
                iconBg = 'bg-purple-50 text-purple-700';
              } else if (item.type === 'warning') {
                Icon = AlertCircle;
                iconBg = 'bg-amber-50 text-amber-700';
              }

              return (
                <div
                  key={item.id}
                  className={`p-4 flex items-start gap-3 transition-colors ${
                    !item.read ? 'bg-emerald-50/30' : 'hover:bg-[#F8FAF9]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-xs text-[#17211B] truncate">{item.title}</p>
                      <span className="text-[10px] text-[#647067] shrink-0">{item.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#647067] mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 bg-[#F8FAF9] border-t border-[#E2E8E4] flex justify-between items-center text-xs">
            <button
              onClick={onClearAll}
              className="text-[#647067] hover:text-rose-600 transition-colors cursor-pointer"
            >
              Xóa tất cả
            </button>
            <span className="text-[11px] text-[#647067] font-mono">LeafAI v2.4</span>
          </div>
        )}
      </div>
    </div>
  );
};
