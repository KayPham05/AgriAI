import React from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa bản ghi chẩn đoán?',
  description = 'Thao tác này sẽ xóa vĩnh viễn kết quả kiểm định này khỏi lịch sử của bạn và không thể hoàn tác.',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border border-[#E2E8E4] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#647067] hover:text-[#17211B] rounded-lg cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="font-display font-bold text-lg text-[#17211B]">{title}</h3>
          <p className="text-sm text-[#647067] mt-1.5 leading-relaxed">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#647067] hover:text-[#17211B] rounded-xl hover:bg-[#F8FAF9] transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xác nhận xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
