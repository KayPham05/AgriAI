import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle, ArrowRight, BrainCircuit, CheckCircle2, ImagePlus,
  Leaf, LoaderCircle, RefreshCw, ScanLine, ShieldCheck, Upload, X, Zap,
} from 'lucide-react';
import { createPrediction, PredictionResponse } from '../services/predictionApi';
import { DiagnosisResult } from '../types';
import { getImageFileError } from '../utils/imageFileValidation';

type PredictionStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

interface DiagnosePageProps {
  authToken?: string;
  onPredictionCreated: (result: DiagnosisResult) => void;
}

const STEPS = [
  { id: 0, label: 'Chọn ảnh', icon: ImagePlus },
  { id: 1, label: 'Phân tích AI', icon: BrainCircuit },
  { id: 2, label: 'Kết quả', icon: CheckCircle2 },
];

export const DiagnosePage: React.FC<DiagnosePageProps> = ({ authToken, onPredictionCreated }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState<PredictionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const selectionIdRef = useRef(0);

  useEffect(() => () => {
    selectionIdRef.current += 1;
    requestRef.current?.abort();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const clearImage = () => {
    selectionIdRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setSelectedFile(null);
    setPreviewUrl(null);
    setResolution('');
    setPrediction(null);
    setError(null);
    setProgress(0);
    setIsPreparing(false);
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const selectFile = (file: File) => {
    clearImage();
    const fileError = getImageFileError(file);
    if (fileError) { setError(fileError); setStatus('error'); return; }

    const selectionId = selectionIdRef.current;
    const url = URL.createObjectURL(file);
    const image = new Image();
    setIsPreparing(true);
    image.onload = () => {
      if (selectionId !== selectionIdRef.current) { URL.revokeObjectURL(url); return; }
      previewRef.current = url;
      setSelectedFile(file);
      setPreviewUrl(url);
      setResolution(`${image.naturalWidth} × ${image.naturalHeight} px`);
      setIsPreparing(false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (selectionId !== selectionIdRef.current) return;
      setIsPreparing(false);
      setError('Không đọc được ảnh. Tệp có thể bị hỏng hoặc sai định dạng.');
      setStatus('error');
    };
    image.src = url;
  };

  const analyze = async () => {
    if (!selectedFile || status === 'uploading' || status === 'analyzing') return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPrediction(null);
    setError(null);
    setProgress(0);
    setStatus('uploading');
    try {
      const result = await createPrediction(selectedFile, {
        token: authToken,
        signal: controller.signal,
        onUploadProgress: setProgress,
        onUploadComplete: () => { if (!controller.signal.aborted) setStatus('analyzing'); },
      });
      if (controller.signal.aborted) return;
      setPrediction(result);
      onPredictionCreated(result.diagnosis);
      setStatus('success');
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : 'Không thể phân tích ảnh. Vui lòng thử lại.');
      setStatus('error');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const busy = status === 'uploading' || status === 'analyzing';
  const activeStep = busy ? 1 : status === 'success' ? 2 : 0;
  const confidencePct = prediction ? (prediction.confidence * 100) : 0;
  const confidenceColor = confidencePct >= 85 ? '#4ade80' : confidencePct >= 60 ? '#facc15' : '#f87171';

  return (
    <div className="diagnose-page min-h-screen" style={{ background: 'var(--armor-bg)' }}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="sr-only"
        aria-label="Chọn ảnh lá cây"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); e.target.value = ''; }}
      />

      {/* ── Hero header ── */}
      <div className="diagnose-hero relative overflow-hidden">
        <div className="diagnose-hero-glow-a" aria-hidden="true" />
        <div className="diagnose-hero-glow-b" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
          {/* Step tracker */}
          <nav className="mb-8 flex items-center gap-0" aria-label="Tiến trình phân tích">
            {STEPS.map((step, i) => {
              const done = i < activeStep;
              const active = i === activeStep;
              const Icon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <div className={`diagnose-step ${active ? 'diagnose-step--active' : done ? 'diagnose-step--done' : 'diagnose-step--pending'}`}>
                    <span className="diagnose-step-icon">
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className="diagnose-step-label">{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`diagnose-step-line ${done ? 'diagnose-step-line--done' : ''}`} aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em]"
              style={{ color: 'var(--bio-bright)' }}>
              <ScanLine className="h-3.5 w-3.5" /> LeafAI · Phân tích lá cây
            </span>
            <h1 className="text-[clamp(1.75rem,4vw,2.8rem)] font-extrabold leading-tight tracking-[-0.04em]"
              style={{ color: 'var(--text-primary)' }}>
              Chẩn đoán từ ảnh lá cây
            </h1>
            <p className="mt-1 max-w-lg text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
              Tải ảnh lá rõ nét lên để mô hình ConvNeXt-Tiny phân loại bệnh và trả về kết quả qua API.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">

          {/* ── Left: Upload zone ── */}
          <section className="diagnose-card" aria-label="Tải ảnh lên">
            <div className="diagnose-card-header">
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Ảnh cần phân tích</h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>JPG hoặc PNG · tối đa 15 MB</p>
              </div>
              {previewUrl && (
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
                    className="diagnose-btn-sm diagnose-btn-sm--outline">
                    <RefreshCw className="h-3.5 w-3.5" /> Đổi ảnh
                  </button>
                  <button type="button" disabled={busy} onClick={clearImage} aria-label="Xóa ảnh"
                    className="diagnose-btn-sm diagnose-btn-sm--danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              {previewUrl ? (
                <div className="space-y-4">
                  {/* Preview image with scan overlay when busy */}
                  <div className="diagnose-preview-wrap">
                    <img src={previewUrl} alt={`Ảnh xem trước: ${selectedFile?.name ?? 'lá cây'}`}
                      className="diagnose-preview-img" />
                    {busy && (
                      <div className="diagnose-scan-overlay" aria-hidden="true">
                        <div className="diagnose-scan-beam" />
                        <div className="diagnose-reticle" />
                      </div>
                    )}
                    {status === 'success' && (
                      <div className="diagnose-success-overlay" aria-hidden="true">
                        <CheckCircle2 className="h-10 w-10" style={{ color: '#4ade80' }} />
                      </div>
                    )}
                  </div>

                  {/* File meta */}
                  <div className="diagnose-file-meta">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selectedFile?.name}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {resolution} · {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              ) : (
                // Drop zone
                <div
                  role="button" tabIndex={0} aria-label="Chọn hoặc thả ảnh lá cây"
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f); }}
                  className={`diagnose-dropzone ${isDragging ? 'diagnose-dropzone--drag' : ''}`}
                >
                  <div className={`diagnose-dropzone-icon ${isDragging ? 'diagnose-dropzone-icon--drag' : ''}`}>
                    {isPreparing ? <LoaderCircle className="h-8 w-8 animate-spin" /> : <ImagePlus className="h-8 w-8" />}
                  </div>
                  <h3 className="mt-5 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {isPreparing ? 'Đang kiểm tra ảnh...' : isDragging ? 'Thả ảnh vào đây!' : 'Kéo thả ảnh lá vào đây'}
                  </h3>
                  <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                    hoặc nhấn để chọn ảnh từ thiết bị
                  </p>
                  <span className="diagnose-upload-btn mt-6">
                    <Upload className="h-4 w-4" /> Chọn ảnh
                  </span>
                  <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                    JPG, PNG — tối đa 15 MB
                  </p>
                </div>
              )}

              {/* Analyze button */}
              {selectedFile && (
                <button type="button" onClick={analyze} disabled={busy}
                  className="diagnose-analyze-btn mt-5">
                  {busy
                    ? <><LoaderCircle className="h-5 w-5 animate-spin" /> {status === 'uploading' ? `Đang tải lên... ${progress}%` : 'Đang phân tích...'}</>
                    : <><Zap className="h-5 w-5" /> Phân tích <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                  }
                </button>
              )}

              {/* Upload progress bar */}
              {status === 'uploading' && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--armor-deep)' }}>
                  <div className="diagnose-upload-progress h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          </section>

          {/* ── Right: Results panel ── */}
          <section className="diagnose-result-panel" aria-live="polite" aria-label="Kết quả phân tích">
            <div className="diagnose-card-header">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Kết quả phân tích</h2>
              {status === 'success' && (
                <span className="diagnose-badge-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã nhận kết quả từ backend
                </span>
              )}
            </div>

            <div className="p-5 sm:p-6">
              {/* Idle */}
              {status === 'idle' && (
                <div className="diagnose-empty-state">
                  <div className="diagnose-empty-icon">
                    <Leaf className="h-8 w-8" />
                  </div>
                  <p className="mt-5 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Kết quả sẽ xuất hiện tại đây
                  </p>
                  <p className="mt-2 max-w-xs text-center text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                    Chọn ảnh lá và nhấn "Phân tích ngay" để gửi đến backend LeafAI.
                  </p>
                </div>
              )}

              {/* Busy */}
              {busy && (
                <div className="diagnose-empty-state" role="status">
                  <div className="diagnose-scanning-anim">
                    <BrainCircuit className="h-8 w-8" style={{ color: 'var(--bio-pulse)' }} />
                    <span className="diagnose-scanning-ring" aria-hidden="true" />
                    <span className="diagnose-scanning-ring diagnose-scanning-ring--2" aria-hidden="true" />
                  </div>
                  <p className="mt-6 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {status === 'uploading' ? 'Đang tải ảnh lên Backend...' : 'Backend đang xử lý phản hồi...'}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Vui lòng giữ trang mở trong giây lát.
                  </p>
                </div>
              )}

              {/* Error */}
              {status === 'error' && (
                <div className="diagnose-error-box" role="alert">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="h-5 w-5 shrink-0" /> Không thể hoàn tất
                  </div>
                  <p className="mt-2 text-sm leading-6">{error}</p>
                  {selectedFile && (
                    <button type="button" onClick={analyze} className="diagnose-retry-btn mt-4">
                      <RefreshCw className="h-4 w-4" /> Thử lại
                    </button>
                  )}
                </div>
              )}

              {/* Success */}
              {status === 'success' && prediction && (
                <div className="space-y-5 animate-[fadeSlideUp_.45s_ease_both]">
                  {/* Thumbnail */}
                  {previewUrl && (
                    <div className="diagnose-result-thumb">
                      <img src={previewUrl} alt="Ảnh lá đã phân tích"
                        className="h-full w-full object-cover" />
                      <div className="diagnose-result-thumb-badge">
                        <ShieldCheck className="h-3.5 w-3.5" /> Đã phân tích
                      </div>
                    </div>
                  )}

                  {/* Result cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="diagnose-result-metric">
                      <span className="diagnose-result-metric-label">Cây trồng</span>
                      <span className="diagnose-result-metric-value">{prediction.crop}</span>
                    </div>
                    <div className="diagnose-result-metric">
                      <span className="diagnose-result-metric-label">Tên bệnh</span>
                      <span className="diagnose-result-metric-value text-sm">{prediction.disease}</span>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="diagnose-confidence-card">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="diagnose-result-metric-label">Độ tin cậy</p>
                        <p className="mt-1 text-4xl font-black leading-none tracking-tight"
                          style={{ color: confidenceColor }}>
                          {confidencePct.toFixed(1)}%
                        </p>
                      </div>
                      <div className="diagnose-confidence-gauge">
                        <svg viewBox="0 0 80 80" className="h-16 w-16 -rotate-90">
                          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="7"
                            stroke="rgba(0,0,0,0.08)" />
                          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="7"
                            stroke={confidenceColor} strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - confidencePct / 100)}`}
                            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: 'var(--armor-deep)' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${confidencePct}%`, background: confidenceColor, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>

                  <p className="flex items-start gap-2 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--bio-pulse)' }} />
                    Kết quả hỗ trợ tham khảo; hãy kết hợp quan sát thực địa và tư vấn chuyên gia khi bệnh lan rộng.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
