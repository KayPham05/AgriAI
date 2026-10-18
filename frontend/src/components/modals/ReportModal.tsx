import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { DiagnosisResult } from '../../types';
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DiagnosisResult | null;
}
export function ReportModal({ isOpen, onClose, result }: ReportModalProps) {
  if (!result) return null;
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="report-dialog max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {result.isDemo ? 'Bản in mẫu minh họa' : 'Kết quả phân loại lá cây'}
          </DialogTitle>
          <DialogDescription>Mã hồ sơ: {result.id}</DialogDescription>
        </DialogHeader>
        <div className="printable-area space-y-6">
          {result.isDemo && (
            <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-foreground">
              DỮ LIỆU MINH HỌA. Không dùng để chẩn đoán hoặc điều trị cây trồng.
            </p>
          )}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Cây trồng', result.plant],
              ['Lớp dự đoán', result.prediction],
              ['Độ tin cậy', `${Math.round(result.confidence * 1000) / 10}%`],
              ['Thời điểm kiểm tra', result.timestamp],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <Image
            unoptimized
            width={640}
            height={480}
            src={result.originalImageUrl}
            alt="Ảnh lá gốc"
            className="aspect-[4/3] max-h-80 w-full rounded-xl bg-surface-muted object-contain"
          />
          {result.gradcam_url && (
            <figure>
              <Image
                unoptimized
                width={640}
                height={480}
                src={result.gradcam_url}
                alt="Bản đồ nhiệt được lưu cùng kết quả"
                className="aspect-[4/3] max-h-80 w-full rounded-xl object-contain"
              />
              <figcaption className="mt-2 text-sm text-muted-foreground">
                Bản đồ nhiệt được lưu cùng kết quả
              </figcaption>
            </figure>
          )}
          {result.top_predictions.length > 0 && (
            <section>
              <h2 className="font-semibold">Các lớp dự đoán</h2>
              <dl className="mt-3 space-y-2">
                {result.top_predictions.map((item) => (
                  <div
                    key={item.className ?? item.label}
                    className="flex justify-between gap-4 text-sm"
                  >
                    <dt>{item.label}</dt>
                    <dd className="tabular-nums">{Math.round(item.confidence * 1000) / 10}%</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            {result.isDemo
              ? 'Bản in này chỉ dùng để xem trước giao diện. Các nhãn bệnh, tỷ lệ và vùng tô màu chưa được tạo bởi mô hình AI. Nếu cây có dấu hiệu bệnh, hãy hỏi cán bộ bảo vệ thực vật tại địa phương.'
              : 'Kết quả hỗ trợ tham khảo; hãy kết hợp quan sát thực địa và tư vấn chuyên gia khi bệnh lan rộng.'}
          </p>
        </div>
        <Button className="print:hidden" onClick={() => window.print()}>
          In / lưu PDF
        </Button>
      </DialogContent>
    </Dialog>
  );
}
