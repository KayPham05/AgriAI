import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface ConfidenceBarProps {
  confidence: number; // 0.0 to 1.0
  category?: 'Độ tin cậy cao' | 'Độ tin cậy trung bình' | 'Độ tin cậy thấp' | 'High confidence' | 'Moderate confidence' | 'Low confidence';
  showExplanation?: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  category,
  showExplanation = true,
}) => {
  const percentage = Math.round(confidence * 1000) / 10;

  // Determine category if not explicitly provided
  let determinedCategory = category;
  if (!determinedCategory) {
    if (confidence >= 0.85) determinedCategory = 'Độ tin cậy cao';
    else if (confidence >= 0.6) determinedCategory = 'Độ tin cậy trung bình';
    else determinedCategory = 'Độ tin cậy thấp';
  } else {
    // Map English to Vietnamese if passed in
    if (determinedCategory === 'High confidence') determinedCategory = 'Độ tin cậy cao';
    if (determinedCategory === 'Moderate confidence') determinedCategory = 'Độ tin cậy trung bình';
    if (determinedCategory === 'Low confidence') determinedCategory = 'Độ tin cậy thấp';
  }

  // Styling by confidence tier
  let barColor = 'bg-emerald-600';
  let badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let Icon = ShieldCheck;

  if (determinedCategory === 'Độ tin cậy trung bình') {
    barColor = 'bg-amber-500';
    badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
    Icon = AlertTriangle;
  } else if (determinedCategory === 'Độ tin cậy thấp') {
    barColor = 'bg-rose-500';
    badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
    Icon = AlertCircle;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#17211B] uppercase tracking-wider">
            Độ tin cậy dự đoán
          </span>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeBg}`}>
            <Icon className="w-3 h-3" />
            <span>{determinedCategory}</span>
          </span>
        </div>
        <span className="font-display font-bold text-lg text-[#17211B]">
          {percentage}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-[#E2E8E4] h-2.5 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
        />
      </div>

      {showExplanation && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#647067] pt-0.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#647067]" />
          <p>
            Dự đoán của AI dựa trên đặc trưng hình thái lá. Khuyến nghị kiểm chứng thực địa với cán bộ bảo vệ thực vật.
          </p>
        </div>
      )}
    </div>
  );
};
