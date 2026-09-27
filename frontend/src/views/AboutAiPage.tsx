import React from 'react';
import { ArrowRight, Camera, Cpu, Leaf, Microscope, ShieldCheck, Sparkles, Zap } from 'lucide-react';

interface AboutAiViewProps { onNavigateDiagnose: () => void; }

export const AboutAiPage: React.FC<AboutAiViewProps> = ({ onNavigateDiagnose }) => (
  <div className="page-wrap pb-20">
    {/* ── Hero Section ── */}
    <section className="relative overflow-hidden bg-[#132a1c]">
      <div className="absolute inset-0">
        <img src="/images/vietnam-rice-farmer.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-35 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b2416] via-[#132a1c]/92 to-[#132a1c]/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#132a1c]/20 to-[#132a1c]" />
        <div className="intro-grid absolute inset-0 opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="max-w-2xl animate-[fadeSlideUp_.6s_ease_both]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#4ade80] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> LeafAI Project
          </span>
          <h1 className="mt-6 text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-white">
            Công nghệ bắt đầu từ sự <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#86efac] to-[#3b82f6]">thấu hiểu</span> cây trồng.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[#9aa89b] font-medium">
            LeafAI ứng dụng ConvNeXt-Tiny để phân loại dấu hiệu bệnh trên lá cây và trình bày kết quả theo cách trực quan, minh bạch. Mục tiêu của dự án là đưa AI đến gần hơn với bài toán nông nghiệp thực tiễn.
          </p>
          <div className="mt-10 flex items-center gap-4">
            <button type="button" onClick={onNavigateDiagnose}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#4ade80] px-6 py-3.5 text-sm font-bold text-[#14532d] transition-all hover:bg-[#22c55e] hover:shadow-[0_0_24px_rgba(74,222,128,.4)] hover:-translate-y-0.5">
              <ScanLineIcon /> Trải nghiệm ngay <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* ── Features Grid ── */}
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="page-hero-eyebrow justify-center"><Cpu className="h-4 w-4" /> Kiến trúc hệ thống</span>
        <h2 className="mt-3 text-3xl font-extrabold text-[#173e2a] sm:text-4xl">Từ ảnh lá đến thông tin chuyên sâu</h2>
        <p className="mt-4 text-base text-[#607163]">
          Một luồng xử lý nhất quán từ ảnh đầu vào, Backend API đến kết quả mà người dùng có thể đọc và lưu lại.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { icon: Camera, title: '1. Kiểm tra ảnh đầu vào', text: 'Giao diện xác nhận định dạng, kích thước và khả năng đọc ảnh trước khi gửi yêu cầu đến Backend.', color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
          { icon: Zap, title: '2. Xử lý ConvNeXt-Tiny', text: 'Mô hình phân tích đặc trưng thị giác trên lá và trả về lớp cây, lớp bệnh cùng độ tin cậy tương ứng.', color: '#10b981', bg: 'rgba(16,185,129,.1)' },
          { icon: ShieldCheck, title: '3. Kết quả trực quan', text: 'Phản hồi được trả về với thông tin bệnh, loại cây và độ tin cậy phần trăm, giúp nông dân dễ dàng đưa ra quyết định phòng trừ.', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
        ].map(({ icon: Icon, title, text, color, bg }, i) => (
          <div key={title} className="group relative overflow-hidden rounded-[28px] border border-[#dce6d5] bg-white p-8 shadow-[0_16px_40px_rgba(36,92,58,.04)] transition-all hover:border-[#b6cdb0] hover:shadow-[0_24px_50px_rgba(36,92,58,.08)] hover:-translate-y-1">
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full opacity-20 transition-transform group-hover:scale-150" style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: bg, color }}>
              <Icon className="h-7 w-7" />
            </span>
            <h3 className="relative mt-8 text-xl font-bold text-[#173e2a]">{title}</h3>
            <p className="relative mt-3 text-sm leading-7 text-[#607163]">{text}</p>
          </div>
        ))}
      </div>
    </section>

    {/* ── Grad-CAM Section ── */}
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 mb-20">
      <div className="relative overflow-hidden rounded-[32px] bg-[#173e2a] p-1">
        <div className="intro-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#173e2a] via-[#1f4e38] to-[#173e2a]" />
        
        <div className="relative flex flex-col gap-10 overflow-hidden rounded-[28px] bg-[#173e2a]/50 p-8 backdrop-blur-xl sm:p-12 lg:flex-row lg:items-center">
          
          <div className="lg:w-1/2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#86efac]">
              <Microscope className="h-4 w-4" /> Explainable AI (XAI)
            </span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Giải thích quyết định với Grad-CAM
            </h2>
            <p className="mt-5 text-base leading-8 text-[#a9c39d]">
              Để AI không còn là một "hộp đen", LeafAI tích hợp kỹ thuật Grad-CAM. Biểu đồ nhiệt (Heatmap) sẽ khoanh vùng chính xác những đốm bệnh trên lá mà mạng nơ-ron đang "nhìn" vào để đưa ra kết luận.
            </p>
            <p className="mt-4 text-sm font-semibold italic text-[#86efac] opacity-80">
              *Tính năng Grad-CAM hiện đang được nghiên cứu và sẽ sớm ra mắt ở phiên bản tiếp theo.
            </p>
          </div>

          <div className="relative flex justify-center lg:w-1/2">
            <div className="relative w-full max-w-md">
              <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-r from-[#4ade80] to-[#3b82f6] opacity-30 blur-2xl" />
              <img 
                src="/images/vietnam-rice-leaves.png" 
                alt="Lá lúa trong khu vực phân tích minh họa" 
                className="relative aspect-video w-full rounded-[24px] object-cover shadow-2xl ring-1 ring-white/10" 
              />
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-green-400">
                    <CheckCircle2Icon />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-300">Nhận diện</p>
                    <p className="text-sm font-bold text-white">Đạo ôn lá lúa</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  </div>
);

const ScanLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>
);

const CheckCircle2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
