import { useId, useState } from 'react';
import Image from 'next/image';
import { PrivateImage } from '@/components/common/PrivateImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BoundingBox } from '../../types';

interface GradCamViewerProps {
  originalUrl: string;
  heatmapUrl: string;
  overlayUrl: string;
  segmentationUrl?: string | null;
  detectionBoxes?: BoundingBox[] | null;
  diseaseLabel: string;
  isDemo?: boolean;
}

export function GradCamViewer({
  originalUrl,
  heatmapUrl,
  overlayUrl,
  segmentationUrl,
  detectionBoxes,
  diseaseLabel,
  isDemo = true,
}: GradCamViewerProps) {
  const [activeTab, setActiveTab] = useState('original');
  const [overlayOpacity, setOverlayOpacity] = useState(0.65);
  const [compareSplit, setCompareSplit] = useState(50);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showSegmentation, setShowSegmentation] = useState(false);
  const opacityId = useId();
  const splitId = useId();

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h3 className="font-semibold">{isDemo ? 'Xem thử bản đồ nhiệt' : 'Bản đồ nhiệt đã lưu'}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {isDemo
            ? 'Bản demo: Vùng màu hiện được tạo để thử giao diện, không phải kết quả Grad-CAM từ mô hình.'
            : 'Vùng chú ý của mô hình không đồng nghĩa với vùng lá bị bệnh.'}
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger className="min-h-11" value="original">
            Ảnh gốc
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="heatmap">
            Bản đồ nhiệt
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="overlay">
            Lớp phủ
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="compare">
            So sánh
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="relative aspect-[4/3] overflow-hidden rounded-media bg-surface-muted">
        <PrivateImage
          unoptimized
          width={640}
          height={480}
          src={activeTab === 'heatmap' ? heatmapUrl || overlayUrl : originalUrl}
          alt={activeTab === 'heatmap' ? 'Bản đồ nhiệt đã lưu' : 'Ảnh lá gốc'}
          className="size-full object-contain"
        />
        {activeTab === 'overlay' && (
          <Image
            unoptimized
            width={640}
            height={480}
            src={heatmapUrl || overlayUrl}
            alt="Lớp màu phủ trên ảnh gốc"
            style={{ opacity: overlayOpacity }}
            className="pointer-events-none absolute inset-0 size-full object-contain"
          />
        )}
        {activeTab === 'compare' && (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
            >
              <Image
                unoptimized
                width={640}
                height={480}
                src={heatmapUrl || overlayUrl}
                alt="Bản đồ nhiệt so sánh"
                className="size-full object-contain"
              />
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary"
              style={{ left: `${compareSplit}%` }}
            />
          </>
        )}
        {showBoxes &&
          activeTab !== 'heatmap' &&
          detectionBoxes?.map((box) => (
            <div
              key={box.id}
              className="pointer-events-none absolute border-2 border-warning"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
              }}
            >
              <span className="bg-surface px-1 text-xs text-foreground">
                {box.label} ({Math.round(box.confidence * 100)}%)
              </span>
            </div>
          ))}
        {showSegmentation && segmentationUrl && activeTab !== 'heatmap' && (
          <Image
            unoptimized
            width={640}
            height={480}
            src={segmentationUrl}
            alt="Mặt nạ phân đoạn đã lưu"
            className="pointer-events-none absolute inset-0 size-full object-contain opacity-70"
          />
        )}
      </div>
      {activeTab === 'overlay' && (
        <div className="space-y-2">
          <Label htmlFor={opacityId}>Độ mờ lớp màu: {Math.round(overlayOpacity * 100)}%</Label>
          <Input
            id={opacityId}
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={overlayOpacity}
            onChange={(event) => setOverlayOpacity(Number(event.target.value))}
            className="border-0 px-0 accent-primary"
          />
        </div>
      )}
      {activeTab === 'compare' && (
        <div className="space-y-2">
          <Label htmlFor={splitId}>Vị trí phân tách: {compareSplit}%</Label>
          <Input
            id={splitId}
            type="range"
            min={5}
            max={95}
            value={compareSplit}
            onChange={(event) => setCompareSplit(Number(event.target.value))}
            className="border-0 px-0 accent-primary"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {Boolean(detectionBoxes?.length) && (
          <Button
            variant="outline"
            aria-pressed={showBoxes}
            onClick={() => setShowBoxes((value) => !value)}
          >
            Khung định vị đã lưu
          </Button>
        )}
        {segmentationUrl && (
          <Button
            variant="outline"
            aria-pressed={showSegmentation}
            onClick={() => setShowSegmentation((value) => !value)}
          >
            Mặt nạ phiến lá
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Lớp dự đoán: {diseaseLabel}</p>
    </div>
  );
}
