import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt intentionally restarts camera acquisition after the user retries a failed permission request.
  useEffect(() => {
    if (!isOpen) {
      setCapturedImage(null);
      return;
    }
    if (capturedImage) return;

    let cancelled = false;
    let cameraStream: MediaStream | null = null;
    setError(null);
    setReady(false);

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        // A permission prompt can resolve after the dialog closes.
        if (cancelled) {
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          return;
        }
        cameraStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (!cancelled)
          setError(
            'Không thể mở máy ảnh. Vui lòng cấp quyền truy cập camera trên trình duyệt hoặc tải ảnh từ tệp.',
          );
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      cameraStream?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, [isOpen, facingMode, capturedImage, attempt]);

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video || !ready || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chụp ảnh lá cây</DialogTitle>
          <DialogDescription>
            Căn chỉnh một lá duy nhất ở trung tâm dưới ánh sáng rõ.
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-media bg-surface-muted">
          {error ? (
            <div role="alert" className="space-y-4 p-6 text-center">
              <p className="text-sm leading-6">{error}</p>
              <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                Thử lại máy ảnh
              </Button>
            </div>
          ) : capturedImage ? (
            <Image
              unoptimized
              width={640}
              height={480}
              src={capturedImage}
              alt="Ảnh lá đã chụp"
              className="size-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setReady(true)}
                aria-label="Hình ảnh trực tiếp từ máy ảnh"
                className="size-full object-cover"
              />
              {!ready && (
                <p
                  role="status"
                  className="absolute inset-x-0 text-center text-sm text-muted-foreground"
                >
                  Đang mở máy ảnh...
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {capturedImage ? (
            <>
              <Button variant="outline" onClick={() => setCapturedImage(null)}>
                Chụp lại
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onCapture(capturedImage);
                  onClose();
                }}
              >
                Sử dụng ảnh này
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                aria-label="Đổi camera trước/sau"
                onClick={() =>
                  setFacingMode((value) => (value === 'environment' ? 'user' : 'environment'))
                }
              >
                <RefreshCw />
              </Button>
              <Button
                className="flex-1"
                disabled={!ready || Boolean(error)}
                onClick={captureSnapshot}
              >
                <Camera />
                Chụp ảnh lá
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
