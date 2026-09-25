import React from 'react';
import { Activity } from 'lucide-react';
import { SeverityInfo } from '../../types';

interface SeverityModuleProps {
  severity: SeverityInfo | null | undefined;
}

export const SeverityModule: React.FC<SeverityModuleProps> = ({ severity }) => {
  // If severity data is unavailable, hide the entire component per specification
  if (!severity) return null;

  const { level, affectedAreaPercentage } = severity;

  let viLevel = level;
  if (level === 'Mild') viLevel = 'Nhẹ';
  if (level === 'Moderate') viLevel = 'Trung bình';
  if (level === 'Severe') viLevel = 'Nặng';

  let levelBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (viLevel === 'Trung bình') {
    levelBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (viLevel === 'Nặng') {
    levelBadgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
  }

  return (
    <div className="bg-[#F8FAF9] rounded-xl p-4 border border-[#E2E8E4] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-700" />
          <h4 className="font-display font-semibold text-xs text-[#17211B] uppercase tracking-wider">
            Mức độ nhiễm bệnh ước lượng
          </h4>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${levelBadgeColor}`}>
          Mức độ: {viLevel}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[#647067]">Tỷ lệ diện tích lá bị tổn thương:</span>
        <span className="font-display font-bold text-base text-[#17211B]">
          {affectedAreaPercentage}%
        </span>
      </div>

      {/* Segmented Gradient Scale (0% - 100%) */}
      <div className="space-y-1.5">
        <div className="h-2 rounded-full w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-600">
          {/* Position Indicator Needle */}
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-white border border-black/30 shadow-md transform -translate-x-1/2"
            style={{ left: `${Math.min(100, Math.max(0, affectedAreaPercentage))}%` }}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-[10px] text-[#647067] font-medium pt-0.5">
          <span>0% Nhẹ</span>
          <span className="text-amber-700">30% Trung bình</span>
          <span className="text-rose-700">100% Nặng</span>
        </div>
      </div>

      <p className="text-[11px] text-[#647067] leading-normal">
        Được ước tính qua phân đoạn pixel vết hoại tử bề mặt phiến lá. Chỉ số này độc lập với độ tin cậy phân loại.
      </p>
    </div>
  );
};
