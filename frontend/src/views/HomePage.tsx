import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BrainCircuit, Camera, CheckCircle2, Database, Leaf, ScanLine, ShieldCheck } from 'lucide-react';
import { NavigationTab, Plant } from '../types';
import { CORE_PLANT_IDS, SUPPORTED_PLANTS } from '../data/plantData';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPlant: (plant: Plant) => void;
}

const steps = [
  { number: '01', icon: Camera, title: 'Chụp một chiếc lá', description: 'Đưa lá vào giữa khung hình, chọn nơi có ánh sáng tự nhiên và lấy nét rõ.' },
  { number: '02', icon: ShieldCheck, title: 'Kiểm tra tệp ảnh', description: 'Định dạng, dung lượng và khả năng mở ảnh được kiểm tra trước khi tải lên.' },
  { number: '03', icon: Leaf, title: 'Xem kết quả', description: 'Nhận loại cây, tên bệnh và độ tin cậy từ hệ thống phân loại LeafAI.' },
];

const corePlants = CORE_PLANT_IDS.map((id) => SUPPORTED_PLANTS.find((plant) => plant.id === id)).filter((plant): plant is Plant => Boolean(plant));
const bannerPlants = [...corePlants, ...SUPPORTED_PLANTS.filter((plant) => !CORE_PLANT_IDS.includes(plant.id))];
const bannerNames: Record<string, string> = {
  rice: 'lúa', tomato: 'cà chua', corn: 'ngô', potato: 'khoai tây', chili: 'ớt',
  coffee: 'cà phê', tea: 'chè', banana: 'chuối', watermelon: 'dưa hấu',
  orange: 'cam', mango: 'xoài', durian: 'sầu riêng', pomelo: 'bưởi',
};
const bannerDescriptions: Record<string, string> = {
  rice: 'Từ ruộng lúa Việt Nam, mỗi chiếc lá kể một câu chuyện về mùa vụ. Cùng quan sát kỹ hơn để chăm cây tốt hơn.',
  tomato: 'Lá cà chua xanh mướt trong vườn nhà. Chụp gần, nhìn rõ từng thay đổi và tìm hiểu những dấu hiệu thường gặp.',
  corn: 'Phiến lá ngô vươn dài dưới nắng. Khám phá hình dạng lá và những dấu hiệu cần quan sát trong mỗi vụ trồng.',
  potato: 'Những lá chét khoai tây nhỏ tạo nên một tán cây đầy sức sống. Một bức ảnh rõ giúp lưu lại chi tiết trên lá.',
  chili: 'Lá ớt thường và những trái ớt nhỏ quen thuộc trong vườn Việt. Cùng tìm hiểu cây từ chính chiếc lá bạn chụp.',
  coffee: 'Giữa vườn cà phê, phiến lá bóng xanh phản chiếu ánh sáng sớm. Quan sát lá là một cách bắt đầu chăm vườn.',
  tea: 'Búp chè non đón sương trên đồi. Những đường gân và mép lá là chi tiết đáng để nhìn gần hơn.',
  banana: 'Tán lá chuối rộng mở giữa khu vườn nhiệt đới. Mỗi vệt màu trên lá đều dễ quan sát khi ảnh đủ rõ.',
  watermelon: 'Dây dưa hấu bò trên luống đất, lá chia thùy rất riêng. Khám phá những chiếc lá quen thuộc của mùa hè.',
  orange: 'Lá cam dày và xanh bóng trong vườn cây có múi. Hãy bắt đầu bằng một bức ảnh lá rõ nét.',
  mango: 'Dưới tán xoài, những chiếc lá dài đón nắng. Một góc vườn quen thuộc để khám phá và quan sát.',
  durian: 'Lá sầu riêng thon dài bao quanh trái non. Tìm hiểu cây từ hình dáng chiếc lá trong vườn.',
  pomelo: 'Lá bưởi xanh đậm bên những trái đang lớn. Cùng nhìn kỹ các chi tiết của một loài cây rất Việt Nam.',
};

const demoScenarios = [
  {
    id: 'rice',
    plant: 'Lúa',
    disease: 'Đạo ôn lá',
    confidence: 94.7,
    imageUrl: '/images/vietnam-rice-leaves.png',
    color: '#ffb45c',
  },
  {
    id: 'tomato',
    plant: 'Cà chua',
    disease: 'Đốm lá sớm',
    confidence: 91.8,
    imageUrl: SUPPORTED_PLANTS.find((plant) => plant.id === 'tomato')?.imageUrl ?? '/images/vietnam-rice-leaves.png',
    color: '#ff8b72',
  },
  {
    id: 'corn',
    plant: 'Ngô',
    disease: 'Gỉ sắt lá',
    confidence: 89.4,
    imageUrl: SUPPORTED_PLANTS.find((plant) => plant.id === 'corn')?.imageUrl ?? '/images/vietnam-rice-leaves.png',
    color: '#e9c65d',
  },
] as const;

interface AiExperienceSectionProps {
  onNavigate: (tab: NavigationTab) => void;
}

const AiExperienceSection: React.FC<AiExperienceSectionProps> = ({ onNavigate }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<(typeof demoScenarios)[number]['id']>('rice');
  const selectedScenario = demoScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? demoScenarios[0];

  return (
    <section className="ai-experience-section mx-auto max-w-[1380px] px-4 py-14 sm:px-8 sm:py-20 lg:px-12">
      <div className="ai-experience-shell overflow-hidden rounded-[32px] border border-white/10 lg:rounded-[48px]">
        <div className="grid lg:grid-cols-[1.08fr_.92fr]">
          <div className="relative min-h-[430px] overflow-hidden bg-[#0c1d13] sm:min-h-[560px]">
            <img key={selectedScenario.id} src={selectedScenario.imageUrl} alt={`Lá ${selectedScenario.plant} dùng minh họa phân tích`} className="ai-experience-image absolute inset-0 h-full w-full object-cover" />
            <div className="ai-experience-image-shade absolute inset-0" />
            <div className="ai-experience-grid absolute inset-0" aria-hidden="true" />
            <div className="ai-experience-sweep absolute inset-x-0" aria-hidden="true" />
            <div className="ai-focus-point ai-focus-point-one" aria-hidden="true"><span /></div>
            <div className="ai-focus-point ai-focus-point-two" aria-hidden="true"><span /></div>

            <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-3 sm:inset-x-8 sm:top-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#10291b]/75 px-3 py-2 text-[11px] font-bold uppercase tracking-[.14em] text-[#d9f3c8] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[#9ee47d] shadow-[0_0_14px_#9ee47d]" /> AI vision preview
              </span>
              <span className="rounded-full border border-white/15 bg-black/30 px-3 py-2 text-[10px] font-semibold text-white/70 backdrop-blur-xl">Dữ liệu minh họa</span>
            </div>

            <div className="absolute inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-8">
              <div className="max-w-sm rounded-[24px] border border-white/15 bg-[#0a1710]/72 p-4 text-white shadow-2xl backdrop-blur-2xl sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#9ee47d]/15 text-[#b8ef9d]"><ScanLine className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Vùng chú ý của mô hình</p><p className="mt-1 truncate text-sm font-semibold text-white">Đang khoanh vùng đặc trưng trên lá</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-between bg-[#10271a] p-6 text-white sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#82b96b]/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#a9d990]"><BrainCircuit className="h-4 w-4" /> Trải nghiệm LeafAI</span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-.035em] text-white sm:text-4xl">Từ một chiếc lá<br />đến tín hiệu dễ hiểu.</h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/60 sm:text-base">Xem trước cách giao diện trình bày kết quả phân loại. Khi dùng thật, ảnh của bạn được gửi đến backend và kết quả được lưu vào tài khoản.</p>

              <div className="mt-7 flex flex-wrap gap-2" role="tablist" aria-label="Chọn mẫu minh họa">
                {demoScenarios.map((scenario) => (
                  <button key={scenario.id} type="button" role="tab" aria-selected={scenario.id === selectedScenario.id} onClick={() => setSelectedScenarioId(scenario.id)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${scenario.id === selectedScenario.id ? 'border-[#a9d990] bg-[#a9d990] text-[#15321e]' : 'border-white/15 bg-white/[.04] text-white/65 hover:border-white/35 hover:text-white'}`}>
                    {scenario.plant}
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[.055] p-5 backdrop-blur-sm sm:p-6" aria-live="polite">
                <div className="flex flex-col gap-5 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
                  <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Kết quả minh họa</p><p className="mt-2 text-2xl font-bold text-white">{selectedScenario.disease}</p><p className="mt-1 text-sm text-[#a9d990]">Cây {selectedScenario.plant}</p></div>
                  <div className="min-[420px]:text-right"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/40">Độ tin cậy</p><p className="mt-1 text-4xl font-black tracking-tight text-white">{selectedScenario.confidence}<span className="text-lg text-[#a9d990]">%</span></p></div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div key={selectedScenario.id} className="ai-confidence-fill h-full rounded-full" style={{ width: `${selectedScenario.confidence}%`, backgroundColor: selectedScenario.color }} /></div>
                <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-white/50"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#a9d990]" /> Kết quả thật luôn đi kèm cảnh báo tham khảo và lịch sử có thể kiểm tra lại.</div>
              </div>
            </div>

            <button type="button" onClick={() => onNavigate('diagnose')} className="group relative mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#b9ef9d] px-6 text-sm font-extrabold text-[#15321e] shadow-[0_16px_36px_rgba(103,172,79,.2)] transition hover:-translate-y-1 hover:bg-[#c9ffac]">
              Phân tích ảnh của bạn <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="grid border-t border-white/10 bg-[#0b1e12] sm:grid-cols-3">
          {[{ icon: BrainCircuit, value: 'ConvNeXt-Tiny', label: 'Kiến trúc phân loại' }, { icon: Database, value: `${corePlants.length} nhóm cây`, label: 'Danh mục tích hợp' }, { icon: ShieldCheck, value: 'JWT + ASP.NET', label: 'Phiên đăng nhập & API' }].map(({ icon: Icon, value, label }) => (
            <div key={value} className="flex items-center gap-4 border-b border-white/10 px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:px-10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[.06] text-[#a9d990]"><Icon className="h-5 w-5" /></span>
              <div><strong className="block text-sm font-bold text-white">{value}</strong><span className="mt-0.5 block text-xs text-white/45">{label}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const HomePage: React.FC<HomeViewProps> = ({ onNavigate, onSelectPlant }) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const activePlant = bannerPlants[activeIndex];
  const activeImage = activePlant.id === 'rice' ? '/images/vietnam-rice-farmer.png' : activePlant.imageUrl;
  const activeFoliage = activePlant.id === 'rice' ? '/images/rice-stalk-cutout.png' : `/images/${activePlant.id}-foliage-cutout.png`;
  const previousPlant = bannerPlants[previousIndex];
  const previousImage = previousPlant.id === 'rice' ? '/images/vietnam-rice-farmer.png' : previousPlant.imageUrl;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!heroRef.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const goToBanner = (index: number) => {
    const next = (index + bannerPlants.length) % bannerPlants.length;
    if (next === activeIndex) return;
    setPreviousIndex(activeIndex);
    setActiveIndex(next);
  };

  useEffect(() => {
    if (isPaused || reduceMotion || !heroVisible) return;
    const timer = window.setInterval(() => goToBanner(activeIndex + 1), 6500);
    return () => window.clearInterval(timer);
  }, [activeIndex, isPaused, reduceMotion, heroVisible]);

  useEffect(() => {
    const nextPlant = bannerPlants[(activeIndex + 1) % bannerPlants.length];
    const nextImage = new Image();
    nextImage.src = nextPlant.id === 'rice' ? '/images/vietnam-rice-farmer.png' : nextPlant.imageUrl;
    const nextFoliage = new Image();
    nextFoliage.src = nextPlant.id === 'rice' ? '/images/rice-stalk-cutout.png' : `/images/${nextPlant.id}-foliage-cutout.png`;
  }, [activeIndex]);
  useEffect(() => {
    const targets = pageRef.current?.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!targets || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    targets.forEach((target) => { target.classList.add('nature-reveal'); observer.observe(target); });
    return () => observer.disconnect();
  }, []);

  const moveHero = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--pointer-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 16}px`);
    event.currentTarget.style.setProperty('--pointer-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 12}px`);
  };

  return (
    <div ref={pageRef} className="nature-page bg-[#f7f8f2] pb-20">
      <section
        ref={heroRef}
        onPointerMove={moveHero}
        onPointerLeave={() => { heroRef.current?.style.setProperty('--pointer-x', '0px'); heroRef.current?.style.setProperty('--pointer-y', '0px'); }}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            goToBanner(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
          }
        }}
        aria-roledescription="carousel"
        aria-label="Banner các loại cây trồng LeafAI"
        className={`nature-hero nature-banner relative flex min-h-[610px] items-center overflow-hidden bg-[#e8edda] sm:min-h-[680px] lg:min-h-[760px] ${isPaused ? 'is-paused' : ''} ${heroVisible ? '' : 'is-offscreen'}`}
      >
        {previousIndex !== activeIndex && <div className="nature-banner-photo nature-banner-photo-previous" aria-hidden="true"><img src={previousImage} alt="" /></div>}
        <div key={`photo-${activePlant.id}`} className="nature-banner-photo nature-banner-photo-active" aria-hidden="true"><img src={activeImage} alt="" /></div>
        <div className="nature-hero-shade" aria-hidden="true" />
        <div className="nature-sunbeam" aria-hidden="true" />
        <div key={`cutout-${activePlant.id}`} className={`nature-cutout-frame nature-cutout-frame-${activePlant.id}`} aria-hidden="true">
          <img className="nature-plant-cutout" src={activeFoliage} alt="" />
        </div>
        {activePlant.id === 'rice' && <>
          {[1, 2, 3].map((leaf) => <img key={leaf} className={`nature-floating-leaf nature-floating-leaf-${leaf}`} src="/images/rice-leaf-cutout.png" alt="" aria-hidden="true" />)}
        </>}

        <div key={`scanner-${activePlant.id}`} className="absolute left-3 top-1/2 z-20 hidden w-[260px] -translate-y-1/2 lg:block xl:left-8 xl:w-[300px] 2xl:left-[3%] 2xl:w-[340px]" style={{ animationDelay: '0.4s' }}>
          <div className="relative overflow-visible">
            <div className="relative rounded-3xl border border-white/60 bg-white/20 p-2.5 shadow-[0_32px_64px_rgba(36,92,58,0.15)] backdrop-blur-xl transition-transform duration-500 hover:scale-[1.02]">
              <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-black/5">
                <img src={activeImage} alt="Scanning" className="aspect-[4/5] w-full object-cover opacity-90" />
                <div className="scan-beam"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bio-reticle h-24 w-24 rounded-2xl border-white/80 xl:h-32 xl:w-32"></div>
                </div>
                <div className="absolute left-3 top-3 xl:left-4 xl:top-4">
                  <span className="mecha-badge mecha-badge-bio animate-bio-pulse border-[#8cb090] bg-white/95 text-[10px] text-[#173e2a] shadow-md backdrop-blur-md xl:px-3 xl:py-1.5 xl:text-xs">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5 xl:h-4 xl:w-4" /> Phân tích AI
                  </span>
                </div>
                <div className="absolute bottom-3 left-0 w-full px-3 xl:bottom-4 xl:px-4">
                  <div className="flex flex-col gap-1.5 rounded-xl border border-white/50 bg-white/90 p-2.5 shadow-lg backdrop-blur-md xl:gap-2 xl:p-3.5">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-[#245c3a] xl:text-sm">Mẫu cây:</span>
                       <span className="text-xs font-black text-[#52814d] xl:text-sm">{activePlant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-[#245c3a] xl:text-sm">Trạng thái:</span>
                       <span className="text-xs font-black text-[#52814d] xl:text-sm">Sẵn sàng</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -left-5 top-1/4 flex h-12 w-12 animate-bounce items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-lg backdrop-blur-md xl:-left-6 xl:h-14 xl:w-14" style={{ animationDuration: '3s' }}>
               <Leaf className="h-6 w-6 text-[#52814d] xl:h-7 xl:w-7" />
            </div>
          </div>
        </div>

        <div className="relative z-10 w-full px-4 py-14 sm:px-8 sm:py-20 lg:pl-[352px] xl:pl-[412px] 2xl:pl-[calc(3vw+420px)]">
          <div key={`copy-${activePlant.id}`} className="nature-banner-copy max-w-[620px] lg:max-w-[700px]" aria-live={isPaused ? 'polite' : 'off'}>
            <h1 className="mt-6 text-[clamp(2.25rem,10vw,4.7rem)] font-extrabold leading-[1.12] tracking-[-.045em] text-[#173e2a] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] sm:mt-7 sm:text-[clamp(2.7rem,7vw,4.7rem)] lg:text-[clamp(3rem,4.2vw,4rem)]">
              Hiểu từng chiếc lá.<br /><span className="bg-gradient-to-r from-[#245c3a] to-[#52814d] bg-clip-text text-transparent">Giữ trọn mùa xanh.</span>
            </h1>
            <p className="mt-6 text-base font-medium leading-8 text-[#3c5440] sm:text-lg">
              {bannerDescriptions[activePlant.id]}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:gap-4">
              <button type="button" onClick={() => onNavigate('diagnose')} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#245c3a] px-8 text-base font-semibold text-white shadow-[0_16px_32px_rgba(24,71,39,.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#1c4b2e] hover:shadow-[0_20px_40px_rgba(24,71,39,.35)]">
                <Camera className="h-5 w-5" /> Chẩn đoán lá ngay <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onSelectPlant(activePlant)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#b8cdb1] bg-white/80 px-7 text-base font-bold text-[#245c3a] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                Khám phá {bannerNames[activePlant.id]}
              </button>
            </div>
          </div>
        </div>
      </section>

      <AiExperienceSection onNavigate={onNavigate} />

      <section className="nature-intro-section mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <img className="nature-intro-leaf" src="/images/rice-leaf-cutout.png" alt="" aria-hidden="true" loading="lazy" />
        <div className="max-w-2xl" data-reveal>
          <span className="text-sm font-bold uppercase tracking-[.2em] text-[#66864d]">Dễ bắt đầu ngay tại vườn</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#173e2a] sm:text-4xl">Ba bước gần gũi, dễ làm</h2>
          <p className="mt-4 text-base leading-7 text-[#607163]">Bắt đầu từ ảnh lá bạn chụp. LeafAI kiểm tra tệp, gửi ảnh đến backend và hiển thị kết quả phân loại theo contract API thống nhất.</p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <div key={number} data-reveal className="nature-step-card group relative overflow-hidden rounded-[32px] border border-[#dce6d5] bg-white p-8 shadow-[0_12px_36px_rgba(46,77,47,.06)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(46,77,47,.12)]">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#f4f7f1] transition-transform duration-500 group-hover:scale-[2.5] group-hover:bg-[#eaf1e3]"></div>
              <div className="relative z-10 flex items-center justify-between"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf1e3] text-[#2d6840] shadow-sm transition-colors duration-300 group-hover:bg-white"><Icon className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" /></span><span className="text-4xl font-black text-[#dce6d5] transition-colors duration-300 group-hover:text-[#b8cdb1]">{number}</span></div>
              <h3 className="relative z-10 mt-8 text-xl font-bold text-[#173e2a] transition-colors duration-300 group-hover:text-[#245c3a]">{title}</h3>
              <p className="relative z-10 mt-3 text-base leading-7 text-[#607163]">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="nature-plants-section bg-[#e8efe2] py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" data-reveal>
            <div><span className="text-sm font-bold uppercase tracking-[.2em] text-[#66864d]">Từ ruộng đồng đến vườn nhà</span><h2 className="mt-3 text-3xl font-bold tracking-tight text-[#173e2a] sm:text-4xl">Cây trồng quen thuộc với người Việt</h2></div>
            <button type="button" onClick={() => onNavigate('plants')} className="inline-flex items-center gap-2 self-start rounded-full border border-[#b8cdb1] bg-white px-5 py-3 text-sm font-semibold text-[#245c3a] transition-colors duration-300 hover:bg-[#f7faf4]">Xem tất cả cây trồng <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="nature-feature-gallery mt-10">
            {corePlants.map((plant) => (
              <button key={plant.id} data-reveal type="button" onClick={() => onSelectPlant(plant)} className="nature-feature-card group relative overflow-hidden text-left">
                <img src={plant.id === 'rice' ? '/images/vietnam-rice-leaves.png' : plant.imageUrl} alt="" className="nature-feature-photo" loading="lazy" />
                <span className="nature-feature-shade" aria-hidden="true" />
                <span className="nature-feature-content">
                  <span className="rounded-2xl border border-white/30 bg-white/20 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-transform duration-500 group-hover:-translate-y-1">
                    <span className="nature-feature-category">{plant.category}</span>
                    <strong className="nature-feature-name">{plant.name}</strong>
                  </span>
                  <span className="nature-feature-arrow"><ArrowRight className="h-5 w-5" /></span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="nature-story-section mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12">
        <div data-reveal className="nature-story-visual relative">
          <div className="nature-photo-frame overflow-hidden"><img src="/images/vietnam-rice-leaves.png" alt="Lá lúa và hạt lúa dưới nắng sớm" className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105" loading="lazy" /></div>
          <img className="nature-story-inset" src="/images/vietnam-tea-plant.png" alt="Lá chè trong vườn Việt Nam" loading="lazy" />
          
          <div className="absolute -left-4 top-1/4 flex animate-bounce flex-col items-center gap-1 rounded-2xl border border-[#dce6d5] bg-white/95 p-4 shadow-xl backdrop-blur-md sm:-left-8" style={{ animationDuration: '4s' }}>
            <span className="text-3xl font-black text-[#245c3a]">{corePlants.length}</span>
            <span className="text-xs font-bold text-[#607163]">Nhóm cây chính</span>
          </div>
          <div className="absolute bottom-1/4 left-2 flex animate-bounce flex-col items-center gap-1 rounded-2xl border border-[#dce6d5] bg-white/95 p-4 shadow-xl backdrop-blur-md sm:left-6" style={{ animationDuration: '5s', animationDelay: '1s' }}>
            <span className="text-3xl font-black text-[#245c3a]">API</span>
            <span className="text-xs font-bold text-[#607163]">Kết nối backend</span>
          </div>
        </div>
        <div data-reveal className="nature-story-copy"><span className="text-sm font-bold uppercase tracking-[.2em] text-[#66864d]">Đồng hành cùng cây trồng</span><h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#173e2a] sm:text-4xl">Một bức ảnh rõ bắt đầu từ sự quan sát kỹ.</h2><p className="mt-5 text-base leading-8 text-[#607163]">Mỗi loại cây có hình dạng lá và dấu hiệu bệnh khác nhau. LeafAI được thiết kế để bạn dễ chụp ảnh, xem lại thông tin và trao đổi với người có chuyên môn khi cần.</p><button type="button" onClick={() => onNavigate('diseases')} className="nature-story-link mt-7 inline-flex items-center gap-2 font-semibold text-[#245c3a]">Tìm hiểu thư viện bệnh lá <ArrowRight className="h-4 w-4" /></button></div>
      </section>
    </div>
  );
};
