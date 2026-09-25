import React from 'react';
import { X, Printer, Download, ShieldCheck, Leaf } from 'lucide-react';
import { DiagnosisResult } from '../../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DiagnosisResult | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E2E8E4] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="p-4 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#17211B]">Bản in mẫu minh họa</h3>
              <p className="text-xs text-[#647067]">Mã hồ sơ: #{result.id.slice(0, 12)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-[#647067] hover:text-[#17211B] hover:bg-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">In báo cáo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#647067] hover:text-[#17211B] rounded-lg cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#17211B] printable-area">
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-950">DỮ LIỆU MINH HỌA — Không dùng để chẩn đoán hoặc điều trị cây trồng.</p>
          
          {/* Top Banner Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8E4]">
            <div>
              <p className="text-[11px] text-[#647067]">Cây trồng</p>
              <p className="font-semibold text-sm text-[#17211B]">{result.plant}</p>
              {result.scientificName && (
                <p className="text-[11px] italic text-[#647067]">{result.scientificName}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] text-[#647067]">Nhãn bệnh của mẫu</p>
              <p className="font-semibold text-sm text-emerald-800">{result.prediction}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#647067]">Độ tin cậy mẫu</p>
              <p className="font-semibold text-sm text-[#17211B]">
                {Math.round(result.confidence * 1000) / 10}%
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#647067]">Thời điểm kiểm tra</p>
              <p className="font-semibold text-xs text-[#17211B]">{result.timestamp}</p>
            </div>
          </div>

          {/* Visual Pair: Original Leaf & Grad-CAM */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#647067] mb-2">
              Ảnh mẫu và bản đồ nhiệt minh họa
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl overflow-hidden border border-[#E2E8E4] aspect-4/3 bg-black flex items-center justify-center">
                <img src={result.originalImageUrl} alt="Ảnh lá gốc" className="w-full h-full object-contain" />
              </div>
              <div className="rounded-xl overflow-hidden border border-[#E2E8E4] aspect-4/3 bg-black flex items-center justify-center">
                <img
                  src={result.gradcam_url || result.originalImageUrl}
                  alt="Vùng kích hoạt Grad-CAM"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Probability Distribution */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-[#647067] mb-2">
              Các lớp mẫu và tỷ lệ minh họa
            </h4>
            <div className="space-y-2">
              {result.top_predictions.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-36 truncate font-medium text-[#17211B]">{p.label}</span>
                  <div className="flex-1 bg-[#E2E8E4] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-600' : 'bg-slate-400'}`}
                      style={{ width: `${Math.round(p.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[#647067]">
                    {Math.round(p.confidence * 1000) / 10}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer stamp */}
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E2E8E4] text-xs text-[#647067] space-y-1">
            <p className="font-medium text-[#17211B]">Lưu ý khi sử dụng:</p>
            <p>
              Bản in này chỉ dùng để xem trước giao diện. Các nhãn bệnh, tỷ lệ và vùng tô màu chưa được tạo bởi mô hình AI. Nếu cây có dấu hiệu bệnh, hãy hỏi cán bộ bảo vệ thực vật tại địa phương.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAF9] border-t border-[#E2E8E4] flex items-center justify-between">
          <span className="text-xs text-[#647067] flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>LeafAI Nông Nghiệp Thông Minh</span>
          </span>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>In / lưu PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
