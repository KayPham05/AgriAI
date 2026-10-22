import type { PredictionResponse } from '@/services/predictionApi';
import { Activity, AlertCircle, BrainCircuit, RefreshCw, ScanEye, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalysisIssueNotice, type AnalysisIssueNoticeProps } from './AnalysisIssueNotice';
import { PredictionComparison } from './PredictionComparison';

interface AnalysisResultCardProps extends Omit<AnalysisIssueNoticeProps, 'issue'> {
  analysisResult: PredictionResponse | null;
  isLoading: boolean;
  isUploading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  issue?: AnalysisIssueNoticeProps['issue'] | null;
  showComparison?: boolean;
}

export function AnalysisResultCard({
  analysisResult,
  isLoading,
  isUploading = false,
  error,
  onRetry,
  issue,
  showComparison = false,
  onChooseImage,
  onChooseSample,
  onShowSupported,
  onViewComparison,
}: AnalysisResultCardProps) {
  const disease = analysisResult?.dto.predictedPlantDisease.disease;
  return (
    <section aria-label="Kết quả phân tích" aria-live="polite" aria-busy={isLoading}>
      <Card className="gap-0 rounded-card border border-border py-0 shadow-sm ring-0">
        <div aria-hidden="true" className="h-1 bg-linear-to-r from-primary to-accent" />
        <CardHeader className="border-b border-border p-6">
          <CardTitle>
            <h2 className="flex items-start gap-3 text-lg font-semibold leading-7">
              <Activity aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
              Kết quả phân tích & Đối chiếu
            </h2>
          </CardTitle>
          <CardDescription className="mt-1 leading-6">
            Phân bổ xác suất Softmax Top-3, triệu chứng nhận diện và khuyến nghị xử lý
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {isLoading ? (
            <div
              role="status"
              className="flex min-h-80 flex-col justify-center rounded-card border border-border bg-surface-muted/50 p-6"
            >
              <p data-result-enter className="font-semibold text-primary">
                {isUploading ? 'Đang tải ảnh lên...' : 'Đang phân loại ảnh lá...'}
              </p>
              <p data-result-enter className="mt-2 text-sm leading-6 text-muted-foreground">
                Vui lòng giữ trang mở trong giây lát.
              </p>
              <div
                data-result-enter
                className="mt-8 flex flex-col gap-5 border-y border-border py-5"
              >
                <p className="flex items-center gap-3 text-sm font-medium">
                  <Upload aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  {isUploading ? 'Ảnh đang được tải lên' : 'Đã tải ảnh lên'}
                </p>
                <p className="flex items-center gap-3 text-sm font-medium">
                  <BrainCircuit aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  {isUploading ? 'Phân loại sau khi tải xong' : 'Đang đối chiếu lớp dự đoán'}
                </p>
              </div>
            </div>
          ) : issue ? (
            <div className="flex flex-col gap-5">
              <AnalysisIssueNotice
                issue={issue}
                onChooseImage={onChooseImage}
                onChooseSample={onChooseSample}
                onShowSupported={onShowSupported}
                onRetry={onRetry}
                onViewComparison={analysisResult && !showComparison ? onViewComparison : undefined}
              />
              {issue.code === 'LOW_CONFIDENCE_SOFTMAX' && showComparison && analysisResult && (
                <PredictionComparison predictions={analysisResult.diagnosis.top_predictions} />
              )}
            </div>
          ) : error ? (
            <div role="alert" data-result-enter className="flex flex-col items-start gap-4">
              <p className="flex items-center gap-2 font-semibold text-destructive">
                <AlertCircle aria-hidden="true" className="size-5" />
                Không thể hoàn tất
              </p>
              <p className="text-sm leading-6">{error}</p>
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  <RefreshCw data-icon="inline-start" />
                  Thử lại
                </Button>
              )}
            </div>
          ) : analysisResult ? (
            <div className="flex flex-col gap-6">
              <div data-result-enter>
                <p className="text-sm text-muted-foreground">{analysisResult.crop}</p>
                <h3 className="mt-2 text-2xl font-semibold">{analysisResult.disease}</h3>
                <p className="mt-4 text-sm text-muted-foreground">Độ tin cậy</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums text-primary">
                  {(analysisResult.confidence * 100).toFixed(1)}%
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Mức độ mô hình nghiêng về lớp dự đoán này, không phải tỷ lệ chắc chắn cây mắc
                  bệnh.
                </p>
              </div>
              <PredictionComparison predictions={analysisResult.diagnosis.top_predictions} />
              <div data-result-enter>
                <h4 className="font-semibold">Triệu chứng nhận diện</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {disease?.symptoms?.trim() || 'Chưa có triệu chứng trong cẩm nang.'}
                </p>
              </div>
              <div data-result-enter>
                <h4 className="font-semibold">Khuyến nghị xử lý</h4>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {disease?.treatment?.trim() || 'Chưa có khuyến nghị xử lý trong cẩm nang.'}
                </p>
              </div>
              <p data-result-enter className="text-sm leading-6 text-muted-foreground">
                Kết quả hỗ trợ tham khảo; hãy kết hợp quan sát thực địa và tư vấn chuyên gia khi
                bệnh lan rộng.
              </p>
            </div>
          ) : (
            <div
              className="flex min-h-80 flex-col items-center justify-center rounded-card border border-border bg-surface-muted/50 px-5 py-10 text-center"
              data-result-enter
            >
              <span className="grid size-14 place-items-center rounded-card border border-border bg-surface text-primary shadow-sm">
                <ScanEye aria-hidden="true" className="size-7" />
              </span>
              <h3 className="mt-5 text-lg font-semibold leading-7">
                Kết quả chẩn đoán sẽ xuất hiện tại đây
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                Nhấn nút <strong className="font-semibold text-foreground">Phân tích ngay</strong> ở
                cột bên trái để mô hình quét bề mặt lá và xuất bảng đối chiếu độ tin cậy.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
