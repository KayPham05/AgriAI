import React, { useState } from 'react';
import { 
  Layers, 
  Sliders, 
  Info, 
  CheckSquare, 
  Square
} from 'lucide-react';
import { BoundingBox } from '../../types';

interface GradCamViewerProps {
  originalUrl: string;
  heatmapUrl: string;
  overlayUrl: string;
  segmentationUrl?: string | null;
  detectionBoxes?: BoundingBox[] | null;
  diseaseLabel: string;
}

export const GradCamViewer: React.FC<GradCamViewerProps> = ({
  originalUrl,
  heatmapUrl,
  overlayUrl,
  segmentationUrl,
  detectionBoxes,
  diseaseLabel,
}) => {
  const [activeTab, setActiveTab] = useState<'overlay' | 'heatmap' | 'original' | 'compare'>('overlay');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.65);
  const [compareSplit, setCompareSplit] = useState<number>(50); // 0 to 100%
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showSegmentation, setShowSegmentation] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8E4] overflow-hidden shadow-sm flex flex-col">
      
      {/* Header & Tabs */}
      <div className="p-4 border-b border-[#E2E8E4] bg-[#F8FAF9] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-semibold text-sm text-[#17211B]">
                Xem thử bản đồ nhiệt
              </span>
              <button
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-[#647067] hover:text-[#17211B] focus:outline-none cursor-pointer"
                aria-label="Giải thích Grad-CAM"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-[#647067]">
              Lớp màu minh họa cho thiết kế Grad-CAM tương lai
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-[#E2E8E4] shadow-2xs text-xs font-medium">
          <button
            onClick={() => setActiveTab('original')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'original'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-[#647067] hover:text-[#17211B]'
            }`}
          >
            Ảnh gốc
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'heatmap'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-[#647067] hover:text-[#17211B]'
            }`}
          >
            Bản đồ nhiệt
          </button>
          <button
            onClick={() => setActiveTab('overlay')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'overlay'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-[#647067] hover:text-[#17211B]'
            }`}
          >
            Lớp phủ
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'compare'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-[#647067] hover:text-[#17211B]'
            }`}
          >
            So sánh
          </button>
        </div>
      </div>

      {/* Info Tooltip Banner (Expandable) */}
      {showTooltip && (
        <div className="p-3 bg-blue-50/80 border-b border-blue-100 text-xs text-blue-900 flex items-start gap-2 animate-in fade-in duration-150">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Bản demo:</strong> Vùng màu hiện được tạo để thử giao diện, không phải kết quả Grad-CAM từ mô hình. Khi mô hình được kết nối, bạn có thể dùng chế độ này để đối chiếu vùng chú ý với triệu chứng trên lá.
          </p>
        </div>
      )}

      {/* Main Visual Stage */}
      <div className="relative aspect-4/3 sm:aspect-16/10 bg-[#0A100D] flex items-center justify-center overflow-hidden select-none">
        
        {/* Original Base Image */}
        {(activeTab === 'original' || activeTab === 'overlay' || activeTab === 'compare') && (
          <img
            src={originalUrl}
            alt="Ảnh lá gốc"
            className="w-full h-full object-contain"
          />
        )}

        {/* Pure Standalone Heatmap */}
        {activeTab === 'heatmap' && (
          <img
            src={heatmapUrl || overlayUrl}
            alt="Bản đồ nhiệt Grad-CAM"
            className="w-full h-full object-contain"
          />
        )}

        {/* Heatmap Overlay with Opacity Control */}
        {activeTab === 'overlay' && (
          <img
            src={heatmapUrl || overlayUrl}
            alt="Lớp phủ Grad-CAM"
            style={{ opacity: overlayOpacity }}
            className="absolute inset-0 w-full h-full object-contain mix-blend-screen pointer-events-none transition-opacity"
          />
        )}

        {/* Split Comparison Slider Mode */}
        {activeTab === 'compare' && (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
          >
            <img
              src={heatmapUrl || overlayUrl}
              alt="Bản đồ nhiệt so sánh"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Interactive Comparison Split Divider Line */}
        {activeTab === 'compare' && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 pointer-events-none"
            style={{ left: `${compareSplit}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white text-emerald-800 rounded-full shadow-md flex items-center justify-center text-[10px] font-bold">
              ↔
            </div>
          </div>
        )}

        {/* Detection Bounding Boxes Overlay */}
        {showBoxes && detectionBoxes && detectionBoxes.length > 0 && activeTab !== 'heatmap' && (
          <div className="absolute inset-0 pointer-events-none">
            {detectionBoxes.map((box) => (
              <div
                key={box.id}
                className="absolute border-2 border-amber-400 bg-amber-400/15 rounded-md transition-all shadow-xs"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
              >
                <span className="absolute -top-5 left-0 bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                  {box.label} ({Math.round(box.confidence * 100)}%)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Optional Segmentation Mask Overlay */}
        {showSegmentation && segmentationUrl && activeTab !== 'heatmap' && (
          <img
            src={segmentationUrl}
            alt="Mặt nạ phân đoạn"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-lighten opacity-70"
          />
        )}

        {/* Colormap Legend Bar at Bottom-Right */}
        {(activeTab === 'heatmap' || activeTab === 'overlay' || activeTab === 'compare') && (
          <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 text-[10px] text-white z-10">
            <span className="text-gray-400">Ít chú ý</span>
            <div 
              className="w-16 h-2 rounded-full"
              style={{
                background: 'linear-gradient(to right, #000080, #00bfff, #00ff00, #ffff00, #ff0000)'
              }}
            />
            <span className="text-amber-300 font-medium">Tập trung cao</span>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-3.5 bg-white border-t border-[#E2E8E4] flex flex-wrap items-center justify-between gap-4 text-xs">
        
        {/* Dynamic Controls based on Active Tab */}
        {activeTab === 'overlay' && (
          <div className="flex items-center gap-2.5 text-[#647067] min-w-[200px]">
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-medium">Độ mờ bản đồ nhiệt:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="accent-emerald-600 w-28 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-[#17211B]">{Math.round(overlayOpacity * 100)}%</span>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="flex items-center gap-2.5 text-[#647067] min-w-[200px]">
            <span className="text-[11px] font-medium">Kéo phân tách:</span>
            <input
              type="range"
              min="5"
              max="95"
              value={compareSplit}
              onChange={(e) => setCompareSplit(parseInt(e.target.value))}
              className="accent-emerald-600 w-32 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-[#17211B]">{compareSplit}%</span>
          </div>
        )}

        {/* Optional Module Toggles */}
        <div className="flex items-center gap-3 ml-auto">
          {detectionBoxes && detectionBoxes.length > 0 && (
            <button
              onClick={() => setShowBoxes(!showBoxes)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                showBoxes
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                  : 'text-[#647067] border-[#E2E8E4] hover:bg-[#F8FAF9]'
              }`}
            >
              {showBoxes ? <CheckSquare className="w-3.5 h-3.5 text-amber-600" /> : <Square className="w-3.5 h-3.5" />}
              <span>Định vị tổn thương</span>
            </button>
          )}

          {segmentationUrl && (
            <button
              onClick={() => setShowSegmentation(!showSegmentation)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                showSegmentation
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                  : 'text-[#647067] border-[#E2E8E4] hover:bg-[#F8FAF9]'
              }`}
            >
              {showSegmentation ? <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> : <Square className="w-3.5 h-3.5" />}
              <span>Mặt nạ phiến lá</span>
            </button>
          )}
        </div>
      </div>

      {/* Explanatory Note Footer */}
      <div className="px-4 py-2.5 bg-[#F8FAF9] border-t border-[#E2E8E4] text-[11px] text-[#647067] flex items-center justify-between">
        <span>Vùng sáng màu tác động trực tiếp đến quyết định của ConvNeXt cho: <strong className="text-[#17211B]">{diseaseLabel}</strong></span>
        <span className="hidden sm:inline text-emerald-700 font-medium">Bản đồ đặc trưng: 224 × 224</span>
      </div>
    </div>
  );
};
