import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ImagePlus, Leaf, LoaderCircle, RefreshCw, Upload, X } from 'lucide-react';
import { createPrediction, PredictionResponse } from '../services/predictionApi';

type PredictionStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const cropNames: Record<string, string> = {
  Tomato: 'Cà chua', Rice: 'Lúa', Corn: 'Ngô', Potato: 'Khoai tây',
  Coffee: 'Cà phê', Tea: 'Chè', Banana: 'Chuối', Watermelon: 'Dưa hấu',
  Chili: 'Ớt', Citrus: 'Cam / Bưởi',
};

export const DiagnosePage: React.FC = () => {
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
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG hoặc PNG. Vui lòng chọn tệp khác.');
      setStatus('error');
      return;
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      setError(file.size === 0 ? 'Tệp ảnh trống.' : 'Ảnh vượt quá giới hạn 15 MB.');
      setStatus('error');
      return;
    }

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
        signal: controller.signal,
        onUploadProgress: setProgress,
        onUploadComplete: () => { if (!controller.signal.aborted) setStatus('analyzing'); },
      });
      if (controller.signal.aborted) return;
      setPrediction(result);
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
  const cropLabel = prediction ? cropNames[prediction.crop] ?? prediction.crop : '';

  return (
    <div className="soft-page mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="sr-only" aria-label="Chọn ảnh lá cây" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) selectFile(file);
        event.target.value = '';
      }} />

      <header className="max-w-3xl">
        <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[.16em] text-[#5c8553]"><Leaf className="h-4 w-4" /> LeafAI Demo</span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#173e2a] sm:text-4xl">Chẩn đoán từ ảnh lá cây</h1>
        <p className="mt-3 text-base leading-7 text-[#607163]">Chọn ảnh lá rõ nét và gửi tới Backend Demo để xem cách kết quả được trình bày. Phản hồi hiện là dữ liệu giả lập, chưa phải dự đoán của mô hình AI.</p>
      </header>

      <ol className="grid grid-cols-3 gap-2 text-xs font-semibold sm:gap-3 sm:text-sm" aria-label="Các bước phân tích">
        {[
          ['01', 'Chọn ảnh'], ['02', 'Tải lên & phân tích'], ['03', 'Xem kết quả'],
        ].map(([number, label], index) => {
          const active = index === 0 ? !busy && status !== 'success' : index === 1 ? busy : status === 'success';
          return <li key={number} className={`rounded-2xl border px-3 py-3 sm:px-5 ${active ? 'border-[#80aa77] bg-[#e9f3e4] text-[#245c3a]' : 'border-[#dce6d5] bg-white text-[#738474]'}`}><span className="mr-2 opacity-60">{number}</span>{label}</li>;
        })}
      </ol>

      <div className="grid items-start gap-7 lg:grid-cols-[1.08fr_.92fr]">
        <section className="soft-workspace-card overflow-hidden rounded-[28px] border border-[#dce6d5] bg-white shadow-[0_16px_46px_rgba(34,69,36,.08)]">
          <div className="border-b border-[#e2eadc] px-5 py-5 sm:px-7"><h2 className="text-lg font-bold text-[#173e2a]">Ảnh cần phân tích</h2><p className="mt-1 text-sm text-[#6a7b6a]">JPG hoặc PNG · tối đa 15 MB</p></div>
          <div className="p-5 sm:p-7">
            {previewUrl ? (
              <div className="space-y-4">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[22px] bg-[#e9efe3]"><img src={previewUrl} alt={`Ảnh xem trước: ${selectedFile?.name ?? 'lá cây'}`} className="h-full w-full object-contain" /></div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-semibold text-[#254d31]">{selectedFile?.name}</p><p className="mt-1 text-xs text-[#718272]">{resolution} · {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(1)} MB</p></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 rounded-xl border border-[#c4d8bb] px-3 py-2 font-semibold text-[#315d3c] hover:bg-[#f3f8ef] disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Đổi ảnh</button><button type="button" disabled={busy} onClick={clearImage} aria-label="Xóa ảnh" className="rounded-xl border border-[#e2e6dc] p-2 text-[#6f756d] hover:bg-[#f8f0ed] hover:text-[#a64336] disabled:opacity-50"><X className="h-4 w-4" /></button></div></div>
              </div>
            ) : (
              <div role="button" tabIndex={0} aria-label="Chọn hoặc thả ảnh lá cây" onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) selectFile(file); }} className={`flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 text-center transition ${isDragging ? 'border-[#4e9154] bg-[#eaf5e5]' : 'border-[#bbd2b1] bg-[#f7faf3] hover:bg-[#eff6e9]'}`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e2efda] text-[#397549]"><ImagePlus className="h-8 w-8" /></span>
                <h3 className="mt-5 text-lg font-bold text-[#244f31]">{isPreparing ? 'Đang kiểm tra ảnh...' : 'Kéo thả ảnh lá vào đây'}</h3>
                <p className="mt-2 text-sm text-[#6b806c]">hoặc nhấn để chọn ảnh từ thiết bị</p>
                <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#245c3a] px-5 py-3 text-sm font-semibold text-white"><Upload className="h-4 w-4" /> Chọn ảnh</span>
              </div>
            )}
            {selectedFile && <button type="button" onClick={analyze} disabled={busy} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#245c3a] px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(24,71,39,.16)] transition hover:bg-[#194b2e] disabled:cursor-wait disabled:opacity-70">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Leaf className="h-5 w-5" />}{status === 'uploading' ? 'Đang tải ảnh lên...' : status === 'analyzing' ? 'Đang phân tích...' : 'Phân tích'}{!busy && <ArrowRight className="h-4 w-4" />}</button>}
          </div>
        </section>

        <section className="soft-workspace-card min-h-[350px] rounded-[28px] border border-[#dce6d5] bg-[#fffef9] p-6 shadow-[0_16px_46px_rgba(34,69,36,.06)] sm:p-8" aria-live="polite">
          <h2 className="text-lg font-bold text-[#173e2a]">Kết quả phân tích</h2>
          {status === 'idle' && <div className="flex min-h-[275px] flex-col items-center justify-center text-center"><Leaf className="h-12 w-12 text-[#a9c39d]" /><p className="mt-5 font-semibold text-[#385d3d]">Kết quả sẽ xuất hiện tại đây</p><p className="mt-2 max-w-xs text-sm leading-6 text-[#758775]">Chọn ảnh và nhấn “Phân tích” để gửi đến Backend Demo.</p></div>}
          {busy && <div className="flex min-h-[275px] flex-col items-center justify-center text-center" role="status"><LoaderCircle className="h-12 w-12 animate-spin text-[#4f9458]" /><p className="mt-5 font-semibold text-[#315d3c]">{status === 'uploading' ? 'Đang tải ảnh lên Backend...' : 'Backend đang xử lý phản hồi...'}</p><p className="mt-2 text-sm text-[#758775]">Vui lòng giữ trang mở trong giây lát.</p>{status === 'uploading' && <div className="mt-5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#e0ebd9]"><div className="h-full rounded-full bg-[#52965a] transition-[width]" style={{ width: `${progress}%` }} /></div>}</div>}
          {status === 'error' && <div className="mt-8 rounded-2xl border border-[#efc5bd] bg-[#fff3ef] p-5 text-[#923d32]" role="alert"><div className="flex items-center gap-2 font-bold"><AlertCircle className="h-5 w-5" /> Không thể hoàn tất</div><p className="mt-2 text-sm leading-6">{error}</p>{selectedFile && <button type="button" onClick={analyze} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#245c3a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#194b2e]"><RefreshCw className="h-4 w-4" /> Thử lại</button>}</div>}
          {status === 'success' && prediction && <div className="mt-7 space-y-6"><div className="inline-flex items-center gap-2 rounded-full bg-[#e6f2df] px-3 py-1.5 text-xs font-bold text-[#2f6a3e]"><CheckCircle2 className="h-4 w-4" /> Đã nhận phản hồi từ Backend Demo</div><dl className="space-y-4"><div className="rounded-2xl bg-[#f1f6ed] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#6a8067]">Cây trồng</dt><dd className="mt-1 text-xl font-bold text-[#173e2a]">{cropLabel}{cropLabel !== prediction.crop && <span className="ml-2 text-sm font-normal text-[#728471]">({prediction.crop})</span>}</dd></div><div className="rounded-2xl bg-[#f1f6ed] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#6a8067]">Tên bệnh</dt><dd className="mt-1 text-xl font-bold text-[#173e2a]">{prediction.disease}</dd></div><div className="rounded-2xl bg-[#f1f6ed] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#6a8067]">Độ tin cậy</dt><dd className="mt-1 text-2xl font-extrabold text-[#2f7941]">{(prediction.confidence * 100).toFixed(1)}%</dd><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#d7e6d0]"><div className="h-full rounded-full bg-[#4b9455]" style={{ width: `${prediction.confidence * 100}%` }} /></div></div></dl><p className="text-xs leading-5 text-[#758775]">Đây là phản hồi giả lập để thử giao diện, không phải chẩn đoán cho ảnh bạn đã tải lên.</p></div>}
        </section>
      </div>
    </div>
  );
};
