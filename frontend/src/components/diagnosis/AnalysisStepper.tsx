import { AlertTriangle, Check } from 'lucide-react';
import { cn } from 'cn';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const steps = [
  { title: 'Chọn ảnh lá', description: 'Tải ảnh rõ nét hoặc chọn mẫu thử' },
  { title: 'Phân tích', description: 'Trích xuất đặc trưng và phân loại ảnh lá' },
  { title: 'Kết quả & Đối chiếu', description: 'Xem độ tin cậy Top-3 & khuyến nghị xử lý' },
];

export function AnalysisStepper({
  currentStep,
  hasIssue = false,
  hasImage = false,
}: {
  currentStep: 1 | 2 | 3;
  hasIssue?: boolean;
  hasImage?: boolean;
}) {
  return (
    <Card className="mb-7 gap-0 rounded-card border border-border py-0 shadow-sm ring-0">
      <ol
        aria-label="Tiến trình phân tích"
        className="grid divide-y divide-border lg:grid-cols-3 lg:divide-x lg:divide-y-0"
      >
        {steps.map((step, index) => {
          const active = currentStep === index + 1;
          const completed = (currentStep === 3 && !hasIssue) || currentStep > index + 1;
          return (
            <li
              key={step.title}
              aria-current={active ? 'step' : undefined}
              className="flex min-w-0 items-center gap-3.5 p-5"
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-full font-semibold tabular-nums',
                  active && hasIssue
                    ? 'bg-warning/10 text-warning ring-4 ring-warning/10'
                    : active
                      ? 'bg-primary text-primary-foreground ring-4 ring-secondary'
                      : completed
                        ? 'bg-secondary text-primary'
                        : 'bg-surface-muted text-muted-foreground',
                )}
              >
                {active && hasIssue ? (
                  <AlertTriangle aria-hidden="true" className="size-5" />
                ) : completed ? (
                  <span role="img" aria-label="Đã hoàn thành">
                    <Check className="size-5" aria-hidden="true" />
                  </span>
                ) : (
                  <span aria-hidden="true">{index + 1}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      'font-semibold',
                      active || completed ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.title}
                  </p>
                  {active && (
                    <Badge variant="secondary">
                      {hasIssue
                        ? 'CẦN KIỂM TRA'
                        : completed
                          ? 'ĐÃ HOÀN TẤT'
                          : currentStep === 1 && !hasImage
                            ? 'CHỌN ẢNH'
                            : 'ĐANG THỰC HIỆN'}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground" title={step.description}>
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
