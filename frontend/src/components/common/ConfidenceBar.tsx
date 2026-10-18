import { Progress } from '@/components/ui/progress';
interface ConfidenceBarProps {
  confidence: number;
  category?:
    | 'Độ tin cậy cao'
    | 'Độ tin cậy trung bình'
    | 'Độ tin cậy thấp'
    | 'High confidence'
    | 'Moderate confidence'
    | 'Low confidence';
  showExplanation?: boolean;
}
export function ConfidenceBar({
  confidence,
  category,
  showExplanation = true,
}: ConfidenceBarProps) {
  const labels: Record<string, string> = {
    'High confidence': 'Độ tin cậy cao',
    'Moderate confidence': 'Độ tin cậy trung bình',
    'Low confidence': 'Độ tin cậy thấp',
  };
  const label = category
    ? (labels[category] ?? category)
    : confidence >= 0.85
      ? 'Độ tin cậy cao'
      : confidence >= 0.6
        ? 'Độ tin cậy trung bình'
        : 'Độ tin cậy thấp';
  const percentage = Math.round(confidence * 1000) / 10;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <strong className="text-2xl font-semibold tabular-nums">{percentage}%</strong>
      </div>
      <Progress value={Math.max(0, Math.min(100, percentage))} aria-label="Độ tin cậy dự đoán" />
      {showExplanation && (
        <p className="text-sm leading-6 text-muted-foreground">
          Dự đoán của AI dựa trên đặc trưng hình thái lá. Khuyến nghị kiểm chứng thực địa với cán bộ
          bảo vệ thực vật.
        </p>
      )}
    </div>
  );
}
