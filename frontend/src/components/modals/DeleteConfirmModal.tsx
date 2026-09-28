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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#E2E8E4] bg-white p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 sm:p-6">
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

        <div className="flex flex-col-reverse gap-2 pt-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-end min-[380px]:gap-3">
          <button
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2 text-sm font-medium text-[#647067] transition-colors hover:bg-[#F8FAF9] hover:text-[#17211B] min-[380px]:w-auto cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 active:bg-rose-800 min-[380px]:w-auto cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xác nhận xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
