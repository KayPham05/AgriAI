import type { DiagnosisIssue, DiagnosisIssueCode } from '@/features/diagnosis/diagnosisIssues';
import { cn } from 'cn';
import {
  type AlertTriangle,
  FileWarning,
  HardDrive,
  ImageOff,
  ScanLine,
  Layers,
  Focus,
  Sun,
  Hand,
  Leaf,
  ChartNoAxesColumn,
  WifiOff,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const content = {
  INVALID_FORMAT: {
    title: 'Định dạng không hỗ trợ',
    description: 'Hệ thống chỉ chấp nhận ảnh JPG hoặc PNG.',
    action: 'Chọn ảnh khác',
    Icon: FileWarning,
    warning: false,
  },
  FILE_TOO_LARGE: {
    title: 'Ảnh vượt quá 15 MB',
    description: 'Vui lòng nén ảnh hoặc chọn tệp có kích thước nhỏ hơn.',
    action: 'Chọn lại ảnh',
    Icon: HardDrive,
    warning: false,
  },
  CORRUPTED_OR_LOW_RES: {
    title: 'Ảnh lỗi hoặc độ phân giải quá thấp',
    description:
      'Không đọc được ảnh hoặc ảnh nhỏ hơn 224 × 224 px. Vui lòng tải lại ảnh gốc rõ nét hơn.',
    action: 'Tải ảnh khác',
    Icon: ImageOff,
    warning: false,
  },
  NO_LEAF_DETECTED: {
    title: 'Không tìm thấy lá cây trong ảnh',
    description: 'Hãy chụp cận cảnh lá cây cần chẩn đoán để lá chiếm phần lớn khung hình.',
    action: 'Chọn ảnh khác',
    Icon: ScanLine,
    warning: false,
  },
  MULTIPLE_LEAVES_CLUTTERED: {
    title: 'Không xác định được lá chính',
    description:
      'Chụp tập trung vào một lá chính, tránh các lá chồng chéo và giữ hậu cảnh gọn gàng.',
    action: 'Chụp/Chọn lại ảnh',
    Icon: Layers,
    warning: true,
  },
  BLURRY_SURFACE: {
    title: 'Bề mặt lá bị mờ',
    description: 'Giữ chắc tay và lấy nét trực tiếp vào vết bệnh trên bề mặt lá.',
    action: 'Thử lại với ảnh rõ nét',
    Icon: Focus,
    warning: true,
  },
  POOR_LIGHTING: {
    title: 'Điều kiện ánh sáng không đảm bảo',
    description: 'Chụp ở nơi đủ sáng tự nhiên, tránh bóng râm che lá hoặc nắng gắt gây lóa.',
    action: 'Tải ảnh khác',
    Icon: Sun,
    warning: true,
  },
  OBSTRUCTED_LEAF: {
    title: 'Bề mặt lá bị che khuất',
    description: 'Lau sạch bùn đất, nước đọng và không để tay che vùng lá bị bệnh.',
    action: 'Chọn ảnh khác',
    Icon: Hand,
    warning: true,
  },
  UNSUPPORTED_SPECIES: {
    title: 'Giống cây chưa được hỗ trợ',
    description:
      'Ảnh nằm ngoài phạm vi cây đang được hệ thống hỗ trợ. Xem danh sách để chọn đúng loại cây trước khi phân tích lại.',
    action: 'Chọn ảnh khác',
    Icon: Leaf,
    warning: true,
  },
  LOW_CONFIDENCE_SOFTMAX: {
    title: 'Độ tin cậy chẩn đoán thấp',
    description:
      'Triệu chứng trên bề mặt lá chưa rõ ràng hoặc bị nhiễu. Hãy chụp lại góc khác rõ vết bệnh hơn.',
    action: 'Chọn ảnh rõ nét hơn',
    Icon: ChartNoAxesColumn,
    warning: true,
  },
  SERVER_TIMEOUT_OR_ERROR: {
    title: 'Gián đoạn quá trình phân tích',
    description:
      'Kết nối hoặc quá trình xử lý đã bị gián đoạn. Ảnh đã chọn được giữ nguyên để bạn thử lại.',
    action: 'Phân tích lại ngay',
    Icon: WifiOff,
    warning: false,
  },
} satisfies Record<
  DiagnosisIssueCode,
  {
    title: string;
    description: string;
    action: string;
    Icon: typeof AlertTriangle;
    warning: boolean;
  }
>;
export interface AnalysisIssueNoticeProps {
  issue: DiagnosisIssue;
  onChooseImage?: () => void;
  onChooseSample?: () => void;
  onShowSupported?: () => void;
  onRetry?: () => void;
  onViewComparison?: () => void;
}
export function AnalysisIssueNotice({
  issue,
  onChooseImage,
  onChooseSample,
  onShowSupported,
  onRetry,
  onViewComparison,
}: AnalysisIssueNoticeProps) {
  const item = content[issue.code];
  const { Icon } = item;
  const server = issue.code === 'SERVER_TIMEOUT_OR_ERROR';
  return (
    <div
      role="alert"
      data-result-enter
      className={cn(
        'flex flex-col gap-5 rounded-card border p-5 sm:p-6',
        item.warning ? 'border-warning/30 bg-warning/5' : 'border-destructive/25 bg-destructive/5',
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={cn('mt-1 size-6 shrink-0', item.warning ? 'text-warning' : 'text-destructive')}
        />
        <div className="min-w-0">
          <h3 className="font-semibold leading-6">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          {issue.detail && issue.detail !== item.description && (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{issue.detail}</p>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold">Mẹo khắc phục nhanh</p>
        <ul
          aria-label="Mẹo chụp ảnh"
          className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"
        >
          {['1 lá chính', 'Đủ sáng', 'Rõ bề mặt'].map((tip) => (
            <li key={tip} className="flex items-center gap-1.5">
              <Check aria-hidden="true" className="size-4 text-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        {issue.code === 'UNSUPPORTED_SPECIES' && onShowSupported ? (
          <Button
            className="h-auto min-h-11 w-full max-w-full py-2 text-left sm:w-auto"
            onClick={onShowSupported}
          >
            <span className="min-w-0 whitespace-normal">Xem danh sách cây hỗ trợ</span>
          </Button>
        ) : (
          <Button
            className="h-auto min-h-11 w-full max-w-full py-2 text-left sm:w-auto"
            disabled={!(server && onRetry ? onRetry : onChooseImage)}
            onClick={server && onRetry ? onRetry : onChooseImage}
          >
            <span className="min-w-0 whitespace-normal">
              {server && !onRetry ? 'Chọn ảnh khác' : item.action}
            </span>
          </Button>
        )}
        {(issue.code === 'NO_LEAF_DETECTED' || issue.code === 'UNSUPPORTED_SPECIES') &&
          onChooseSample && (
            <Button variant="outline" onClick={onChooseSample}>
              Chọn mẫu thử
            </Button>
          )}
        {issue.code === 'LOW_CONFIDENCE_SOFTMAX' && onViewComparison && (
          <Button
            variant="outline"
            className="h-auto min-h-11 w-full max-w-full py-2 text-left sm:w-auto"
            onClick={onViewComparison}
          >
            <span className="min-w-0 whitespace-normal">Xem tạm bảng đối chiếu Top-3</span>
          </Button>
        )}
      </div>
      {issue.code === 'LOW_CONFIDENCE_SOFTMAX' && (
        <p className="text-xs font-medium leading-5 text-warning">
          Kết quả chỉ mang tính tham khảo, chưa đủ cơ sở để kết luận bệnh.
        </p>
      )}
    </div>
  );
}
