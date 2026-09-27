import React from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ImageIcon,
  LockKeyhole,
  ScanLine,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Sprout,
  UploadCloud,
  Zap,
} from 'lucide-react';

interface IntroPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const workflowSteps = [
  {
    icon: UploadCloud,
    number: '01',
    title: 'Đưa chiếc lá vào khung hình',
    description: 'Chụp mới hoặc tải ảnh JPG, PNG rõ nét từ điện thoại và máy tính.',
  },
  {
    icon: ScanSearch,
    number: '02',
    title: 'Để AI đọc những dấu hiệu nhỏ',
    description: 'ConvNeXt-Tiny phân tích đặc trưng thị giác và đối chiếu lớp bệnh phù hợp.',
  },
  {
    icon: CheckCircle2,
    number: '03',
    title: 'Nhận kết quả dễ hành động',
    description: 'Xem loại cây, bệnh dự đoán, độ tin cậy và lưu lại lịch sử theo dõi.',
  },
];

const platformHighlights = [
  { icon: BrainCircuit, value: 'ConvNeXt-Tiny', label: 'Kiến trúc phân loại hình ảnh' },
  { icon: ImageIcon, value: 'JPG · PNG', label: 'Tải ảnh linh hoạt đến 15 MB' },
  { icon: Clock3, value: 'Một luồng', label: 'Từ tải ảnh đến lưu lịch sử' },
  { icon: ShieldCheck, value: 'Minh bạch', label: 'Hiển thị rõ độ tin cậy' },
];

const principles = [
  'Kết quả đến trực tiếp từ Backend API',
  'Không hard-code dự đoán trên giao diện',
  'Luôn thể hiện rõ mức độ tin cậy',
];

export const IntroPage: React.FC<IntroPageProps> = ({ onLogin, onRegister }) => (
  <div className="intro-premium min-h-screen overflow-x-hidden bg-[#f4f6ef] text-[#173e2a]">
    <header className="absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-5 sm:px-7 lg:px-10">
        <a href="#intro" className="group flex items-center gap-3" aria-label="LeafAI - Trang giới thiệu">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-1 shadow-lg backdrop-blur-xl sm:h-12 sm:w-12">
            <img src="/images/logo.png" alt="Logo LeafAI" className="h-full w-full object-contain transition duration-500 group-hover:scale-110" />
          </span>
          <span>
            <strong className="block text-xl font-black tracking-[-.03em] text-white">Leaf<span className="text-[#b5dc8d]">AI</span></strong>
            <span className="hidden text-[9px] font-bold uppercase tracking-[.24em] text-white/45 sm:block">Vì cây trồng Việt</span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-white/65 md:flex" aria-label="Điều hướng trang giới thiệu">
          <a href="#how-it-works" className="transition hover:text-white">Quy trình</a>
          <a href="#technology" className="transition hover:text-white">Công nghệ</a>
          <a href="#responsibility" className="transition hover:text-white">Trách nhiệm</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={onLogin} className="hidden min-h-11 items-center rounded-full px-4 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex">Đăng nhập</button>
          <button type="button" onClick={onRegister} className="intro-shine-button group inline-flex min-h-11 items-center gap-2 rounded-full bg-[#d4efa9] px-4 text-sm font-black text-[#143823] shadow-[0_12px_35px_rgba(166,219,115,.18)] transition hover:-translate-y-0.5 hover:bg-white sm:px-5">
            Bắt đầu miễn phí <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </header>

    <main id="intro">
      <section className="intro-hero relative isolate min-h-[860px] overflow-hidden bg-[#0c2819] pb-16 pt-28 text-white sm:pt-32 lg:flex lg:min-h-screen lg:items-center lg:pb-20">
        <div className="intro-grid absolute inset-0 -z-10 opacity-30" />
        <div className="intro-aurora intro-aurora-one" />
        <div className="intro-aurora intro-aurora-two" />
        <img src="/images/tomato-foliage-cutout.png" alt="" className="intro-floating-leaf absolute -left-24 bottom-[-7rem] -z-[5] w-[360px] opacity-10 sm:w-[480px]" />

        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-14 px-4 sm:px-7 lg:grid-cols-[.9fr_1.1fr] lg:px-10 xl:gap-20">
          <div className="relative z-10 max-w-3xl pt-6 lg:pt-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b9df93]/25 bg-[#b9df93]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#ccebab] backdrop-blur-xl">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b9e58d] opacity-50" /><span className="relative h-2 w-2 rounded-full bg-[#c7ef9e]" /></span>
              Plant intelligence platform
            </span>

            <h1 className="mt-7 max-w-[760px] text-[clamp(3.4rem,7.6vw,7.6rem)] font-black leading-[.86] tracking-[-.07em] text-white">
              Hiểu từng<br />chiếc lá.<br /><span className="intro-gradient-text">Giữ trọn mùa xanh.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-8 text-white/60 sm:text-lg sm:leading-9">
              Một trải nghiệm chẩn đoán bệnh lá cây được thiết kế để biến ảnh chụp đơn giản thành thông tin rõ ràng, trực quan và dễ theo dõi.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onRegister} className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-[#d4efa9] px-7 text-base font-black text-[#143823] shadow-[0_20px_55px_rgba(146,202,91,.2)] transition hover:-translate-y-1 hover:bg-white">
                Tạo tài khoản miễn phí <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <a href="#how-it-works" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[.06] px-7 text-base font-bold text-white backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/10">
                Xem cách hoạt động <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-white/45">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#bce194]" /> Không cần cài đặt</span>
              <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#bce194]" /> Phiên đăng nhập bằng JWT</span>
              <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-[#bce194]" /> Trải nghiệm liền mạch</span>
            </div>
          </div>

          <div className="intro-visual relative mx-auto w-full max-w-[760px] lg:mx-0 lg:ml-auto">
            <div className="relative ml-auto aspect-[1.06/1] w-[94%] overflow-hidden rounded-[44px] border border-white/15 bg-[#173d27] shadow-[0_60px_140px_rgba(0,0,0,.42)] sm:rounded-[60px]">
              <img src="/images/vietnam-tomato-plant.png" alt="Cây cà chua Việt Nam đang được LeafAI phân tích" className="h-full w-full object-cover object-center" />
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(7,29,17,.1),rgba(7,29,17,.02)_48%,rgba(7,29,17,.36)),linear-gradient(0deg,rgba(5,22,12,.7),transparent_55%)]" />
              <div className="intro-scan-grid absolute inset-0" />
              <div className="intro-scan-line absolute inset-x-0 top-0 h-28" />

              <div className="absolute left-[27%] top-[30%] h-24 w-24 rounded-[24px] border-2 border-[#d6f5b6]/85 shadow-[0_0_35px_rgba(187,236,139,.3)] sm:h-32 sm:w-32 sm:rounded-[30px]">
                <span className="absolute -right-1 -top-8 rounded-full bg-[#d4efa9] px-3 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#173e2a]">Vùng quan sát</span>
                <span className="absolute inset-3 rounded-[17px] border border-dashed border-white/60 sm:rounded-[22px]" />
              </div>

              <div className="absolute inset-x-4 bottom-4 rounded-[28px] border border-white/15 bg-[#0a2115]/82 p-4 shadow-2xl backdrop-blur-2xl sm:inset-x-7 sm:bottom-7 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#bce693]"><ScanLine className="h-3.5 w-3.5" /> Kết quả minh họa</span>
                    <h2 className="mt-2 text-xl font-black text-white sm:text-3xl">Bệnh đốm vòng</h2>
                    <p className="mt-1 text-xs text-white/45 sm:text-sm">Cà chua · Early Blight</p>
                  </div>
                  <div className="text-right">
                    <strong className="block text-3xl font-black tracking-tight text-[#d4efa9] sm:text-5xl">94<span className="text-lg sm:text-2xl">%</span></strong>
                    <span className="text-[9px] font-bold uppercase tracking-[.15em] text-white/35">Độ tin cậy</span>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="intro-confidence block h-full w-[94%] rounded-full bg-gradient-to-r from-[#79aa61] to-[#d4efa9]" /></div>
              </div>
            </div>

            <div className="intro-float-card intro-float-card-top absolute -left-1 top-[10%] rounded-3xl border border-white/15 bg-[#f8fff2]/95 p-3.5 text-[#173e2a] shadow-[0_24px_65px_rgba(0,0,0,.28)] backdrop-blur-xl sm:-left-5 sm:p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#dcefd0] text-[#377443]"><BrainCircuit className="h-6 w-6" /></span>
                <div><p className="text-xs font-black">ConvNeXt-Tiny</p><p className="mt-1 text-[10px] text-[#718073]">AI đang phân tích ảnh</p></div>
              </div>
            </div>

            <div className="intro-float-card intro-float-card-side absolute -right-1 top-[19%] hidden rounded-2xl border border-white/15 bg-[#102f1e]/88 px-4 py-3 text-white shadow-xl backdrop-blur-xl sm:block">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-white/45"><span className="h-2 w-2 rounded-full bg-[#bce194] shadow-[0_0_12px_#bce194]" /> API connected</p>
            </div>
          </div>
        </div>

        <a href="#how-it-works" aria-label="Xem cách LeafAI hoạt động" className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[9px] font-bold uppercase tracking-[.24em] text-white/30 xl:flex">
          Cuộn để khám phá <ChevronDown className="h-5 w-5 animate-bounce text-[#bce194]" />
        </a>
      </section>

      <section aria-label="Năng lực nền tảng" className="relative z-10 -mt-px border-y border-[#dce8d5] bg-[#f9faf5] px-4 sm:px-7 lg:px-10">
        <div className="mx-auto grid max-w-[1440px] divide-y divide-[#dce8d5] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {platformHighlights.map(({ icon: Icon, value, label }) => (
            <div key={value} className="flex items-center gap-4 px-2 py-6 sm:px-6 lg:py-7">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e4eedc] text-[#477b47]"><Icon className="h-5 w-5" /></span>
              <div><strong className="block text-sm font-black text-[#173e2a]">{value}</strong><span className="mt-1 block text-[11px] leading-5 text-[#758176]">{label}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="relative overflow-hidden px-4 py-24 sm:px-7 sm:py-32 lg:px-10">
        <img src="/images/rice-stalk-cutout.png" alt="" className="absolute -right-20 top-8 w-72 rotate-[-12deg] opacity-[.08] sm:w-[460px]" />
        <div className="mx-auto max-w-[1320px]">
          <div className="grid items-end gap-8 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#629054]"><Sparkles className="h-4 w-4" /> Đơn giản từ lần đầu</p>
              <h2 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] tracking-[-.045em] text-[#173e2a] sm:text-6xl">Ba bước.<br />Một góc nhìn rõ hơn.</h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#637166] lg:ml-auto lg:text-lg">LeafAI loại bỏ những thao tác dư thừa để người dùng tập trung vào điều quan trọng nhất: chiếc lá, kết quả và hành động tiếp theo.</p>
          </div>

          <div className="mt-16 grid gap-5 lg:grid-cols-3">
            {workflowSteps.map(({ icon: Icon, number, title, description }, index) => (
              <article key={number} className={`intro-step-card group relative min-h-[330px] overflow-hidden rounded-[34px] border p-7 sm:p-9 ${index === 1 ? 'border-[#2e6240] bg-[#173e2a] text-white lg:-translate-y-5' : 'border-[#d9e7d3] bg-[#fffef9] text-[#173e2a]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl ${index === 1 ? 'bg-white/10 text-[#c8e8a9]' : 'bg-[#e5f0df] text-[#477e48]'}`}><Icon className="h-7 w-7" /></span>
                  <span className={`text-5xl font-black tracking-[-.06em] ${index === 1 ? 'text-white/10' : 'text-[#e5eddf]'}`}>{number}</span>
                </div>
                <h3 className={`mt-16 max-w-xs text-2xl font-black leading-tight ${index === 1 ? 'text-white' : 'text-[#20472d]'}`}>{title}</h3>
                <p className={`mt-4 max-w-sm text-sm leading-7 ${index === 1 ? 'text-white/55' : 'text-[#68776a]'}`}>{description}</p>
                <span className={`absolute bottom-0 left-0 h-1 w-0 transition-all duration-500 group-hover:w-full ${index === 1 ? 'bg-[#bce194]' : 'bg-[#659754]'}`} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="technology" className="px-4 pb-24 sm:px-7 sm:pb-32 lg:px-10">
        <div className="mx-auto grid max-w-[1320px] overflow-hidden rounded-[44px] bg-[#0d281a] shadow-[0_40px_100px_rgba(20,55,30,.2)] lg:grid-cols-[1.08fr_.92fr]">
          <div className="relative min-h-[520px] overflow-hidden sm:min-h-[650px]">
            <img src="/images/vietnam-rice-leaves.png" alt="Lá cây trong giao diện phân tích của LeafAI" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,22,12,.8),rgba(5,22,12,.08)_65%),linear-gradient(90deg,transparent,rgba(5,22,12,.25))]" />
            <div className="intro-scan-grid absolute inset-0 opacity-50" />
            <div className="intro-scan-line intro-scan-line-slow absolute inset-x-0 top-0 h-28" />

            <div className="absolute left-6 top-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-[#092015]/70 px-4 py-3 text-white backdrop-blur-xl sm:left-9 sm:top-9">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c5eb9d] opacity-50" /><span className="relative h-2.5 w-2.5 rounded-full bg-[#c5eb9d]" /></span>
              <span className="text-[10px] font-bold uppercase tracking-[.18em]">Đang đọc đặc trưng hình ảnh</span>
            </div>

            <div className="absolute inset-x-5 bottom-5 rounded-[28px] border border-white/15 bg-[#092015]/80 p-5 text-white backdrop-blur-2xl sm:inset-x-9 sm:bottom-9 sm:p-7">
              <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
                <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bce194]">Prediction response</p><h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">Thông tin rõ ràng, không phỏng đoán mơ hồ.</h3></div>
                <span className="inline-flex items-center gap-2 text-xs font-bold text-white/55"><span className="h-2 w-2 rounded-full bg-[#bce194]" /> JSON từ Backend</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-14">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-[#b9dc98]"><BrainCircuit className="h-4 w-4" /> Công nghệ phía sau trải nghiệm</span>
            <h2 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-.04em] text-white sm:text-5xl">Mạnh ở bên trong.<br />Dễ hiểu ở bên ngoài.</h2>
            <p className="mt-6 text-sm leading-8 text-white/55 sm:text-base">Frontend kiểm tra ảnh, giao tiếp với Backend API và biến dữ liệu dự đoán thành một kết quả trực quan mà người dùng có thể đọc ngay.</p>

            <div className="mt-9 space-y-4">
              {principles.map((principle) => (
                <div key={principle} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.045] px-4 py-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#bce194]/15 text-[#c9eca7]"><Check className="h-4 w-4" /></span>
                  <span className="text-sm font-semibold text-white/75">{principle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="responsibility" className="px-4 pb-24 sm:px-7 sm:pb-32 lg:px-10">
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 rounded-[42px] border border-[#dbe8d5] bg-[#fffef9] p-6 shadow-[0_24px_70px_rgba(39,76,42,.08)] sm:p-10 lg:grid-cols-[.9fr_1.1fr] lg:p-14">
          <div className="relative mx-auto aspect-square w-full max-w-[430px]">
            <div className="absolute inset-0 rounded-full border border-[#cddfc5]" />
            <div className="intro-orbit-reverse absolute inset-[12%] rounded-full border border-dashed border-[#a9c79d]" />
            <div className="absolute inset-[24%] grid place-items-center rounded-full bg-[#173e2a] shadow-[0_28px_60px_rgba(31,70,38,.22)]">
              <Sprout className="h-20 w-20 text-[#c8e7a8] sm:h-24 sm:w-24" />
            </div>
            <span className="intro-orbit-dot absolute left-[4%] top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-2xl border border-[#d7e5d1] bg-white text-[#54814e] shadow-lg"><ShieldCheck className="h-6 w-6" /></span>
            <span className="intro-orbit-dot intro-orbit-dot-two absolute right-[6%] top-[14%] grid h-14 w-14 place-items-center rounded-2xl border border-[#d7e5d1] bg-white text-[#54814e] shadow-lg"><BrainCircuit className="h-6 w-6" /></span>
            <span className="intro-orbit-dot intro-orbit-dot-three absolute bottom-[7%] right-[17%] grid h-14 w-14 place-items-center rounded-2xl border border-[#d7e5d1] bg-white text-[#54814e] shadow-lg"><ShieldCheck className="h-6 w-6" /></span>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#629054]">AI có trách nhiệm</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-[-.04em] text-[#173e2a] sm:text-5xl">AI hỗ trợ quan sát.<br />Con người đưa ra quyết định.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#637166]">LeafAI luôn đặt độ tin cậy cạnh kết quả và khuyến nghị kết hợp với tình trạng thực địa hoặc ý kiến chuyên gia nông nghiệp.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#edf4e8] p-5"><Camera className="h-6 w-6 text-[#54814e]" /><strong className="mt-4 block text-sm font-black">Ảnh tốt, tín hiệu tốt</strong><p className="mt-2 text-xs leading-6 text-[#6e7b70]">Khuyến khích ảnh rõ, đủ sáng và tập trung vào vùng lá.</p></div>
              <div className="rounded-2xl bg-[#edf4e8] p-5"><ShieldCheck className="h-6 w-6 text-[#54814e]" /><strong className="mt-4 block text-sm font-black">Kết quả để tham khảo</strong><p className="mt-2 text-xs leading-6 text-[#6e7b70]">Không thay thế chẩn đoán của chuyên gia nông nghiệp.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-7 sm:pb-12 lg:px-10">
        <div className="intro-cta relative mx-auto max-w-[1320px] overflow-hidden rounded-[42px] bg-[#173e2a] px-6 py-16 text-center text-white shadow-[0_30px_80px_rgba(24,65,35,.2)] sm:px-10 sm:py-20">
          <div className="intro-grid absolute inset-0 opacity-20" />
          <img src="/images/mango-foliage-cutout.png" alt="" className="absolute -left-20 -top-12 w-72 rotate-[18deg] opacity-10 sm:w-96" />
          <img src="/images/coffee-foliage-cutout.png" alt="" className="absolute -bottom-20 -right-24 w-72 -rotate-12 opacity-10 sm:w-96" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-[#bce194]"><Sparkles className="h-4 w-4" /> Sẵn sàng cho mùa xanh hơn</span>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-.045em] text-white sm:text-6xl">Biến một bức ảnh thành<br className="hidden sm:block" /> một quyết định sáng suốt hơn.</h2>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">Tạo tài khoản để bắt đầu chẩn đoán, lưu lịch sử và theo dõi cây trồng của bạn.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <button type="button" onClick={onRegister} className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d4efa9] px-8 font-black text-[#143823] transition hover:-translate-y-1 hover:bg-white">Đăng ký LeafAI <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></button>
              <button type="button" onClick={onLogin} className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[.06] px-8 font-bold text-white transition hover:-translate-y-1 hover:bg-white/10">Tôi đã có tài khoản</button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer className="px-4 py-8 sm:px-7 lg:px-10">
      <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 border-t border-[#d8e5d2] pt-7 text-center text-xs text-[#718073] sm:flex-row sm:text-left">
        <span className="inline-flex items-center gap-2 font-black text-[#355c3d]"><span className="grid h-8 w-8 place-items-center overflow-hidden rounded-xl border border-[#d4e2cf] bg-white p-0.5"><img src="/images/logo.png" alt="" className="h-full w-full object-contain" /></span> LeafAI · Vì cây trồng Việt</span>
        <span>Kết quả AI mang tính hỗ trợ tham khảo, không thay thế chuyên gia nông nghiệp.</span>
      </div>
    </footer>
  </div>
);
