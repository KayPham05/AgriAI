import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCaptured, setHasCaptured] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setHasCaptured(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setError('Không thể mở máy ảnh. Vui lòng cấp quyền truy cập camera trên trình duyệt hoặc tải ảnh từ tệp.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setHasCaptured(dataUrl);
  };

  const handleConfirmUse = () => {
    if (hasCaptured) {
      onCapture(hasCaptured);
      stopCamera();
      onClose();
    }
  };

  const handleRetake = () => {
    setHasCaptured(null);
    startCamera();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-[#E2E8E4]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8E4] flex items-center justify-between bg-[#F8FAF9]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-[#17211B] text-base">Chụp ảnh lá cây</h3>
              <p className="text-xs text-[#647067]">Căn chỉnh một lá duy nhất ở trung tâm dưới ánh sáng rõ</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-[#647067] hover:text-[#17211B] rounded-lg hover:bg-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Capture Canvas */}
        <div className="relative bg-black aspect-4/3 flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-white max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-medium mb-2">{error}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Thử lại máy ảnh
              </button>
            </div>
          ) : hasCaptured ? (
            <img src={hasCaptured} alt="Ảnh lá đã chụp" className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Subtle Scanning Reticle Guidelines */}
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between text-emerald-400 text-[10px] font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded w-max">
                  <span>VÙNG LẤY NÉT</span>
                </div>
                <div className="text-center text-white/90 text-xs bg-black/50 px-3 py-1 rounded-full self-center">
                  Đặt phiến lá nằm trọn trong khung viền
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 sm:p-5 bg-white flex items-center justify-between gap-3">
          {hasCaptured ? (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8E4] text-[#17211B] font-medium text-sm hover:bg-[#F8FAF9] transition-colors cursor-pointer"
              >
                Chụp lại
              </button>
              <button
                onClick={handleConfirmUse}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Sử dụng ảnh này</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleFacingMode}
                className="p-2.5 rounded-xl border border-[#E2E8E4] text-[#647067] hover:text-[#17211B] hover:bg-[#F8FAF9] cursor-pointer"
                title="Đổi camera trước/sau"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleCaptureSnapshot}
                disabled={!!error}
                className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Chụp ảnh lá</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
