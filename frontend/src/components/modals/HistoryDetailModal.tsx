import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { DiagnosisResult } from '../../types';
import { GradCamViewer } from '../features/GradCamViewer';
import { ConfidenceBar } from '../common/ConfidenceBar';
import { ReportModal } from './ReportModal';
interface HistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DiagnosisResult | null;
  onAnalyzeNew: () => void;
}
export function HistoryDetailModal({
  isOpen,
  onClose,
  result,
  onAnalyzeNew,
}: HistoryDetailModalProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  if (!result) return null;
  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết kết quả phân loại</DialogTitle>
            <DialogDescription>Thời điểm ghi nhận: {result.timestamp}</DialogDescription>
          </DialogHeader>
          {result.isDemo && (
            <p className="rounded-xl bg-secondary p-3 text-sm">
              Dữ liệu này được lưu cục bộ từ phiên dùng thử.
            </p>
          )}
          <div className="grid items-start gap-6 md:grid-cols-2">
            {result.gradcam_url ? (
              <GradCamViewer
                originalUrl={result.originalImageUrl}
                heatmapUrl={result.gradcam_url}
                overlayUrl={result.gradcam_url}
                segmentationUrl={null}
                detectionBoxes={null}
                diseaseLabel={result.prediction}
                isDemo={result.isDemo ?? false}
              />
            ) : (
              <img
                src={result.originalImageUrl}
                alt="Ảnh lá đã phân tích"
                className="aspect-[4/3] w-full rounded-xl bg-surface-muted object-contain"
              />
            )}
            <div className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">{result.plant}</p>
                <h2 className="mt-1 text-2xl font-semibold">{result.prediction}</h2>
                {result.scientificName && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {result.scientificName}
                  </p>
                )}
              </div>
              <ConfidenceBar confidence={result.confidence} category={result.confidenceCategory} />
              {result.top_predictions.length > 1 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <h3 className="font-medium">Các lớp dự đoán khác</h3>
                  {result.top_predictions.slice(1).map((item) => (
                    <p
                      key={item.className ?? item.label}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span>{item.label}</span>
                      <span className="tabular-nums">
                        {Math.round(item.confidence * 1000) / 10}%
                      </span>
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {result.isDemo ? 'Lưu trên trình duyệt' : 'Lưu trong tài khoản'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setIsReportOpen(true)}>
              In / lưu PDF
            </Button>
            <Button
              onClick={() => {
                onClose();
                onAnalyzeNew();
              }}
            >
              Kiểm tra lá mới
            </Button>
          </div>
          <ReportModal
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            result={result}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
