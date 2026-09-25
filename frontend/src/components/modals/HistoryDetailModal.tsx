import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Download
} from 'lucide-react';
import { DiagnosisResult } from '../../types';
import { GradCamViewer } from '../features/GradCamViewer';
import { ConfidenceBar } from '../common/ConfidenceBar';
import { ReportModal } from './ReportModal';

interface HistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DiagnosisResult | null;
  onAnalyzeNew: () => void;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  isOpen,
  onClose,
  result,
  onAnalyzeNew,
}) => {
  const [isReportOpen, setIsReportOpen] = useState(false);

  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-[#E2E8E4] shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-[#17211B]">
                Chi tiết mẫu minh họa
              </h2>
              <p className="text-xs text-[#647067]">
                Thời điểm ghi nhận: {result.timestamp}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#647067] hover:text-[#17211B] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Dữ liệu này chỉ minh họa giao diện. Bản đồ nhiệt không được tạo từ mô hình AI.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Left: Grad-CAM Viewer */}
            <div className="md:col-span-7">
              <GradCamViewer
                originalUrl={result.originalImageUrl}
                heatmapUrl={result.gradcam_url}
                overlayUrl={result.gradcam_url}
                segmentationUrl={null}
                detectionBoxes={null}
                diseaseLabel={result.prediction}
              />
            </div>

            {/* Right: Metrics & Details */}
            <div className="md:col-span-5 space-y-5">
              
              <div className="bg-[#F8FAF9] p-5 rounded-2xl border border-[#E2E8E4] space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                    Cây chủ: {result.plant}
                  </span>
                  <h3 className="font-display font-bold text-xl text-[#17211B] mt-0.5">
                    {result.prediction}
                  </h3>
                  {result.scientificName && (
                    <p className="text-xs italic text-[#647067]">{result.scientificName}</p>
                  )}
                </div>

                {/* Confidence Bar */}
                <ConfidenceBar
                  confidence={result.confidence}
                  category={result.confidenceCategory}
                />

                {/* Alternative predictions */}
                {result.top_predictions.length > 1 && (
                  <div className="space-y-2 pt-2 border-t border-[#E2E8E4]">
                    <span className="text-xs font-semibold text-[#17211B] block">Các lớp mẫu khác:</span>
                    <div className="space-y-1.5">
                      {result.top_predictions.slice(1).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-[#647067]">{item.label}</span>
                          <span className="font-mono text-[#17211B]">{Math.round(item.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Severity */}

                {/* Meta info */}
                <div className="pt-2 border-t border-[#E2E8E4] text-[11px] text-[#647067] space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Trạng thái:</span>
                    <span className="text-[#17211B]">Dữ liệu minh họa</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mã hồ sơ:</span>
                    <span className="text-[#17211B]">{result.id}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E2E8E4] bg-[#F8FAF9] flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setIsReportOpen(true)}
            className="px-4 py-2.5 bg-white border border-[#E2E8E4] hover:bg-[#F8FAF9] text-[#17211B] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#647067]" />
            <span>In / lưu PDF</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#647067] hover:text-[#17211B] cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                onClose();
                onAnalyzeNew();
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>Chẩn đoán ảnh mới</span>
            </button>
          </div>
        </div>

      </div>

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        result={result}
      />

    </div>
  );
};
