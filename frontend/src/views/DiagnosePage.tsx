import type React from 'react';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ImagePlus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { createPrediction, type PredictionResponse } from '../services/predictionApi';
import type { DiagnosisResult } from '../types';
import { getImageFileError } from '../utils/imageFileValidation';

gsap.registerPlugin(useGSAP);

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
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!pageRef.current || typeof window.matchMedia !== 'function') return;
      const root = pageRef.current;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--analysis-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--analysis-enter-duration'));
      const stagger = parseFloat(tokens.getPropertyValue('--analysis-enter-stagger'));
      if (![distance, duration, stagger].every(Number.isFinite)) return;

      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const currentStep = root.querySelector('[aria-current="step"] > span');
        if (currentStep) {
          gsap.fromTo(
            currentStep,
            { y: distance, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            },
          );
        }
        const resultParts = root.querySelectorAll('[data-result-enter]');
        if (resultParts.length) {
          gsap.fromTo(
            resultParts,
            { y: distance, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration,
              stagger,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            },
          );
        }
        if (status === 'idle' && previewUrl) {
          gsap.fromTo(
            '[data-preview-enter]',
            { scale: 0.98, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            },
          );
        }
      });
      return () => media.revert();
    },
    { scope: pageRef, dependencies: [status, previewUrl], revertOnUpdate: true },
  );

  useEffect(
    () => () => {
      selectionIdRef.current += 1;
      requestRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

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
    if (fileError) {
      setError(fileError);
      setStatus('error');
      return;
    }

    const selectionId = selectionIdRef.current;
    const url = URL.createObjectURL(file);
    const image = new Image();
    setIsPreparing(true);
    image.onload = () => {
      if (selectionId !== selectionIdRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
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
        onUploadComplete: () => {
          if (!controller.signal.aborted) setStatus('analyzing');
        },
      });
      if (controller.signal.aborted) return;
      setPrediction(result);
      onPredictionCreated(result.diagnosis);
      setStatus('success');
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof Error ? cause.message : 'Không thể phân tích ảnh. Vui lòng thử lại.',
      );
      setStatus('error');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const busy = status === 'uploading' || status === 'analyzing';
  const activeStep = busy ? 1 : status === 'success' ? 2 : 0;
  const confidencePct = prediction ? prediction.confidence * 100 : 0;

  return (
    <div ref={pageRef} className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
      <Input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        aria-label="Chọn ảnh lá cây"
        disabled={busy || isPreparing}
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) selectFile(file);
          e.target.value = '';
        }}
      />
      <header className="border-b border-border pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Kiểm tra ảnh lá cây
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Chọn một ảnh rõ nét. Bạn sẽ nhận được lớp dự đoán và độ tin cậy để đối chiếu.
        </p>
      </header>
      <ol
        className="my-7 grid grid-cols-3 gap-3 text-sm sm:gap-6"
        aria-label="Tiến trình phân tích"
      >
        {STEPS.map((step, index) => (
          <li
            key={step.id}
            aria-current={index === activeStep ? 'step' : undefined}
            className={
              index === activeStep
                ? 'flex flex-col items-start gap-2 border-b-2 border-primary pb-4 font-semibold text-primary sm:flex-row sm:items-center sm:gap-3'
                : 'flex flex-col items-start gap-2 border-b border-border pb-4 text-muted-foreground sm:flex-row sm:items-center sm:gap-3'
            }
          >
            <span
              className={
                index === activeStep
                  ? 'grid size-8 shrink-0 place-items-center rounded-full bg-primary tabular-nums text-primary-foreground'
                  : 'grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted tabular-nums'
              }
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
      <div className="grid items-start gap-8 lg:grid-cols-5">
        <section
          className="min-w-0 overflow-hidden rounded-card border border-border bg-surface lg:col-span-3"
          aria-label="Tải ảnh lên"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-semibold">Ảnh cần phân tích</h2>
              <p className="mt-1 text-sm text-muted-foreground">JPG hoặc PNG · tối đa 15 MB</p>
            </div>
            {previewUrl && (
              <div className="flex gap-1">
                <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                  <RefreshCw />
                  Đổi ảnh
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={clearImage}
                  aria-label="Xóa ảnh"
                >
                  <X />
                </Button>
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            {previewUrl ? (
              <div>
                <NextImage
                  unoptimized
                  width={640}
                  height={480}
                  data-preview-enter
                  src={previewUrl}
                  alt={`Ảnh xem trước: ${selectedFile?.name ?? 'lá cây'}`}
                  className="aspect-[4/3] w-full rounded-xl bg-surface-muted object-contain"
                />
                <p className="mt-4 break-all text-sm font-medium">{selectedFile?.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {resolution} · {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <fieldset
                aria-label="Chọn hoặc thả ảnh lá"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) selectFile(file);
                }}
                className={`flex min-h-80 min-w-0 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center ${isDragging ? 'border-primary bg-secondary' : 'border-primary/50 bg-surface-muted'}`}
              >
                <ImagePlus className="size-10 text-primary" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">
                  {isPreparing
                    ? 'Đang kiểm tra ảnh...'
                    : isDragging
                      ? 'Thả ảnh vào đây'
                      : 'Kéo thả ảnh lá vào đây'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Một lá chính, đủ sáng và nhìn rõ bề mặt.
                </p>
                <Button
                  className="mt-5"
                  disabled={isPreparing}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload />
                  Chọn ảnh
                </Button>
              </fieldset>
            )}
            {selectedFile && (
              <Button className="mt-5 w-full" size="lg" onClick={analyze} disabled={busy}>
                {busy ? (
                  status === 'uploading' ? (
                    `Đang tải lên... ${progress}%`
                  ) : (
                    'Đang phân tích...'
                  )
                ) : (
                  <>
                    Phân tích <ArrowRight />
                  </>
                )}
              </Button>
            )}
            {status === 'uploading' && (
              <Progress className="mt-4" value={progress} aria-label="Tiến độ tải ảnh" />
            )}
          </div>
        </section>
        <section
          className="min-w-0 border-t-2 border-primary lg:col-span-2"
          aria-live="polite"
          aria-label="Kết quả phân tích"
          aria-busy={busy}
        >
          <h2 className="border-b border-border py-5 text-lg font-semibold">Kết quả phân tích</h2>
          <div className="py-6">
            {status === 'idle' && (
              <div className="flex min-h-64 flex-col justify-center border-b border-border pb-8">
                <p className="font-medium">Kết quả sẽ xuất hiện tại đây</p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  Chọn ảnh lá và nhấn “Phân tích” khi ảnh đã sẵn sàng.
                </p>
              </div>
            )}
            {busy && (
              <div className="min-h-64 py-8" role="status">
                <p data-result-enter className="font-semibold text-primary">
                  {status === 'uploading' ? 'Đang tải ảnh lên...' : 'Đang phân loại ảnh lá...'}
                </p>
                <p data-result-enter className="mt-2 text-sm leading-6 text-muted-foreground">
                  Vui lòng giữ trang mở trong giây lát.
                </p>
                <div data-result-enter className="mt-8 border-y border-border py-5">
                  <p className="flex items-center gap-3 text-sm font-medium">
                    <Upload className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    {status === 'uploading' ? 'Ảnh đang được tải lên' : 'Đã tải ảnh lên'}
                  </p>
                  <p className="mt-5 flex items-center gap-3 text-sm font-medium">
                    <BrainCircuit className="size-5 shrink-0 text-primary" aria-hidden="true" />
                    {status === 'uploading'
                      ? 'Phân loại sau khi tải xong'
                      : 'Đang đối chiếu lớp dự đoán'}
                  </p>
                </div>
              </div>
            )}
            {status === 'error' && (
              <div role="alert" className="space-y-4" data-result-enter>
                <p className="flex items-center gap-2 font-semibold text-destructive">
                  <AlertCircle className="size-5" />
                  Không thể hoàn tất
                </p>
                <p className="text-sm leading-6">{error}</p>
                {selectedFile && (
                  <Button variant="outline" onClick={analyze}>
                    <RefreshCw />
                    Thử lại
                  </Button>
                )}
              </div>
            )}
            {status === 'success' && prediction && (
              <div className="space-y-6">
                <div data-result-enter>
                  <p className="text-sm text-muted-foreground">{prediction.crop}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{prediction.disease}</h3>
                </div>
                <div data-result-enter className="border-y border-border py-5">
                  <p className="text-sm text-muted-foreground">Độ tin cậy</p>
                  <p className="mt-2 text-4xl font-semibold tabular-nums text-primary">
                    {confidencePct.toFixed(1)}%
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Mức độ mô hình nghiêng về lớp dự đoán này, không phải tỷ lệ chắc chắn cây mắc
                    bệnh.
                  </p>
                </div>
                <p data-result-enter className="text-sm leading-6 text-muted-foreground">
                  Kết quả hỗ trợ tham khảo; hãy kết hợp quan sát thực địa và tư vấn chuyên gia khi
                  bệnh lan rộng.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
