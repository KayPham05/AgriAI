import type { TopPrediction } from '@/types';
import { Progress } from '@/components/ui/progress';

export function PredictionComparison({ predictions }: { predictions: TopPrediction[] }) {
  return (
    <div data-result-enter className="border-y border-border py-5">
      <h4 className="font-semibold">Đối chiếu Top-3</h4>
      <ol aria-label="Dự đoán Top-3" className="mt-4 flex flex-col gap-4">
        {predictions.slice(0, 3).map((item) => (
          <li key={item.className ?? item.label}>
            <div className="mb-2 flex items-start justify-between gap-3 text-sm">
              <span>{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums">
                {(item.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={item.confidence * 100} aria-label={`Độ tin cậy: ${item.label}`} />
          </li>
        ))}
      </ol>
    </div>
  );
}
