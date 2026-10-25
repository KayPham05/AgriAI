import type React from 'react';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ArrowRight, ImagePlus, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnalysisStepper } from '@/components/diagnosis/AnalysisStepper';
import { AnalysisResultCard } from '@/components/diagnosis/AnalysisResultCard';
import { AnalysisIssueNotice } from '@/components/diagnosis/AnalysisIssueNotice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getInputIssue,
  getResolutionIssue,
  getConfidenceIssue,
  getRequestIssue,
  isInputIssue,
  type DiagnosisIssue,
} from '@/features/diagnosis/diagnosisIssues';
import sampleLeaf from '@/assets/Bệnh lá/cà chua/Cháy lá sớm  đốm vòng.jpg';
import { createPrediction, type PredictionResponse } from '../services/predictionApi';
import type { DiagnosisResult, Plant } from '../types';
import type { AgriculturalProfile } from '@/services/agriculturalProfileApi';

gsap.registerPlugin(useGSAP);

type PredictionStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error' | 'attention';

interface DiagnosePageProps {
  authToken?: string;
  onPredictionCreated: (result: DiagnosisResult) => void;
  supportedPlants?: Plant[];
  agriculturalProfiles?: AgriculturalProfile[];
}

export const DiagnosePage: React.FC<DiagnosePageProps> = ({
  authToken,
  onPredictionCreated,
  supportedPlants = [],
  agriculturalProfiles = [],
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState<PredictionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [issue, setIssue] = useState<DiagnosisIssue | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showSupported, setShowSupported] = useState(false);
  const [isSample, setIsSample] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAgriculturalProfileId, setSelectedAgriculturalProfileId] = useState<string | undefined>();
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
    setIssue(null);
    setShowComparison(false);
    setIsSample(false);
    setProgress(0);
    setIsPreparing(false);
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const selectFile = (file: File, sample = false) => {
    clearImage();
    const fileError = getInputIssue(file);
    if (fileError) {
      setIssue(fileError);
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
      const resolutionIssue = getResolutionIssue(image.naturalWidth, image.naturalHeight);
      if (resolutionIssue) {
        URL.revokeObjectURL(url);
        setIsPreparing(false);
        setIssue(resolutionIssue);
        setStatus('error');
        return;
      }
      previewRef.current = url;
      setIsSample(sample);
      setSelectedFile(file);
      setPreviewUrl(url);
      setResolution(`${image.naturalWidth} × ${image.naturalHeight} px`);
      setIsPreparing(false);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      if (selectionId !== selectionIdRef.current) return;
      setIsPreparing(false);
      setIssue({ code: 'CORRUPTED_OR_LOW_RES' });
      setStatus('error');
    };
    image.src = url;
  };

  const chooseSample = async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsPreparing(true);
    let timedOut = false;
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    try {
      const response = await fetch(sampleLeaf.src, { signal: controller.signal });
      if (!response.ok) throw new Error('Không tải được ảnh mẫu. Vui lòng chọn ảnh từ thiết bị.');
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      selectFile(new File([blob], 'anh-la-mau.jpg', { type: 'image/jpeg' }), true);
    } catch (cause) {
      if (controller.signal.aborted && !timedOut) return;
      setIssue(
        getRequestIssue(
          timedOut
            ? new Error('Tải ảnh mẫu quá thời gian chờ. Vui lòng chọn ảnh từ thiết bị.')
            : cause,
        ),
      );
      setStatus('error');
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (!controller.signal.aborted || timedOut) setIsPreparing(false);
      }
    }
  };

  const analyze = async () => {
    if (!selectedFile || isPreparing || status === 'uploading' || status === 'analyzing') return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPrediction(null);
    setIssue(null);
    setShowComparison(false);
    setProgress(0);
    setStatus('uploading');
    try {
      const result = await createPrediction(selectedFile, {
        token: authToken,
        agriculturalProfileId: selectedAgriculturalProfileId,
        signal: controller.signal,
        onUploadProgress: setProgress,
        onUploadComplete: () => {
          if (!controller.signal.aborted) setStatus('analyzing');
        },
      });
      if (controller.signal.aborted) return;
      setPrediction(result);
      onPredictionCreated(result.diagnosis);
      const confidenceIssue = getConfidenceIssue(result);
      setIssue(confidenceIssue);
      setStatus(confidenceIssue ? 'attention' : 'success');
    } catch (cause) {
      if (controller.signal.aborted) return;
      setIssue(getRequestIssue(cause));
      setStatus('error');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const busy = status === 'uploading' || status === 'analyzing';
  const inputIssue = issue && isInputIssue(issue) ? issue : null;
  const resultIssue = issue && !isInputIssue(issue) ? issue : null;
  const currentStep = busy
    ? 2
    : status === 'success' ||
        resultIssue?.code === 'LOW_CONFIDENCE_SOFTMAX' ||
        resultIssue?.code === 'SERVER_TIMEOUT_OR_ERROR'
      ? 3
      : resultIssue
        ? 2
        : 1;
  const chooseImage = () => inputRef.current?.click();

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
      <h1 className="sr-only">Chẩn đoán ảnh lá</h1>
      <AnalysisStepper
        currentStep={currentStep}
        hasIssue={!!issue}
        hasImage={Boolean(selectedFile) || isPreparing}
      />
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
          {authToken && (
            <div className="border-b border-border bg-surface-muted p-5 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div>
                  <Label htmlFor="diagnosis-agricultural-profile" className="font-semibold">
                    Hồ sơ nông nghiệp
                  </Label>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Gắn kết kết quả với một khu vực canh tác tùy chọn.
                  </p>
                </div>
                <Select
                  value={selectedAgriculturalProfileId ?? 'none'}
                  onValueChange={(value) => setSelectedAgriculturalProfileId(value === 'none' ? undefined : value)}
                  disabled={busy || isPreparing}
                >
                  <SelectTrigger id="diagnosis-agricultural-profile" className="w-full sm:w-64">
                    <SelectValue placeholder="Không gắn hồ sơ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không gắn hồ sơ</SelectItem>
                    {agriculturalProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {agriculturalProfiles.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Bạn có thể tạo hồ sơ trong mục Hồ sơ nông nghiệp trước khi chẩn đoán.
                </p>
              )}
            </div>
          )}
          <div className="p-5 sm:p-6">
            {inputIssue && (
              <div className="mb-5">
                <AnalysisIssueNotice issue={inputIssue} onChooseImage={chooseImage} />
              </div>
            )}
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
                {isSample && (
                  <p className="mt-2 text-sm text-warning">
                    Ảnh mẫu minh họa từ cẩm nang. Kết quả chỉ được tạo sau khi bạn nhấn Phân tích
                    ngay.
                  </p>
                )}
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
                <Button
                  variant="link"
                  className="mt-2"
                  disabled={isPreparing}
                  onClick={() => void chooseSample()}
                >
                  Chọn mẫu thử
                </Button>
              </fieldset>
            )}
            {selectedFile && (
              <Button
                className="mt-5 w-full"
                size="lg"
                onClick={analyze}
                disabled={busy || isPreparing}
              >
                {busy ? (
                  status === 'uploading' ? (
                    `Đang tải lên... ${progress}%`
                  ) : (
                    'Đang phân tích...'
                  )
                ) : (
                  <>
                    Phân tích ngay <ArrowRight />
                  </>
                )}
              </Button>
            )}
            {status === 'uploading' && (
              <Progress className="mt-4" value={progress} aria-label="Tiến độ tải ảnh" />
            )}
          </div>
        </section>
        <div className="min-w-0 lg:col-span-2">
          <AnalysisResultCard
            analysisResult={prediction}
            isLoading={busy}
            isUploading={status === 'uploading'}
            issue={resultIssue}
            showComparison={showComparison}
            onChooseImage={chooseImage}
            onChooseSample={() => void chooseSample()}
            onShowSupported={() => setShowSupported(true)}
            onViewComparison={() => setShowComparison(true)}
            onRetry={selectedFile ? analyze : undefined}
          />
        </div>
      </div>
      <Dialog open={showSupported} onOpenChange={setShowSupported}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cây trồng đang được hỗ trợ</DialogTitle>
            <DialogDescription>
              Danh sách cây đang hoạt động từ hệ thống. Các cây chỉ có trong cẩm nang tham khảo
              không được đưa vào danh sách này.
            </DialogDescription>
          </DialogHeader>
          {supportedPlants.length > 0 ? (
            <ul className="grid max-h-80 gap-3 overflow-y-auto sm:grid-cols-2">
              {supportedPlants.map((plant) => (
                <li
                  key={plant.backendId ?? plant.id}
                  className="rounded-xl border border-border p-3 text-sm"
                >
                  {plant.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Chưa tải được danh sách cây đang hoạt động. Vui lòng thử lại sau.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
