import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Leaf, ShieldCheck } from 'lucide-react';
import { NavigationTab, Plant } from '../types';
import { CORE_PLANT_IDS, SUPPORTED_PLANTS } from '../data/plantData';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPlant: (plant: Plant) => void;
}

const steps = [
  { number: '01', icon: Camera, title: 'Chụp một chiếc lá', description: 'Đưa lá vào giữa khung hình, chọn nơi có ánh sáng tự nhiên và lấy nét rõ.' },
  { number: '02', icon: ShieldCheck, title: 'Kiểm tra tệp ảnh', description: 'Định dạng, dung lượng và khả năng mở ảnh được kiểm tra trước khi tải lên.' },
  { number: '03', icon: Leaf, title: 'Xem kết quả demo', description: 'Gửi ảnh tới Backend Demo để xem cách LeafAI trình bày cây, bệnh và độ tin cậy.' },
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
        className={`nature-hero nature-banner relative flex min-h-[730px] items-center overflow-hidden bg-[#e8edda] lg:min-h-[760px] ${isPaused ? 'is-paused' : ''} ${heroVisible ? '' : 'is-offscreen'}`}
      >
        {previousIndex !== activeIndex && <div className="nature-banner-photo nature-banner-photo-previous" aria-hidden="true"><img src={previousImage} alt="" /></div>}
        <div key={activePlant.id} className="nature-banner-photo nature-banner-photo-active" aria-hidden="true"><img src={activeImage} alt="" /></div>
        <div className="nature-hero-shade" aria-hidden="true" />
        <div className="nature-sunbeam" aria-hidden="true" />
        <div key={activePlant.id} className={`nature-cutout-frame nature-cutout-frame-${activePlant.id}`} aria-hidden="true">
          <img className="nature-plant-cutout" src={activeFoliage} alt="" />
        </div>
        {activePlant.id === 'rice' && <>
          {[1, 2, 3].map((leaf) => <img key={leaf} className={`nature-floating-leaf nature-floating-leaf-${leaf}`} src="/images/rice-leaf-cutout.png" alt="" aria-hidden="true" />)}
        </>}

        {/* Floating AI HUD - Đặt sát lề trái theo yêu cầu */}
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
                       <span className="text-xs font-bold text-[#245c3a] xl:text-sm">Bệnh lý:</span>
                       <span className="text-xs font-black text-[#52814d] xl:text-sm">Khỏe mạnh</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-[#245c3a] xl:text-sm">Độ tin cậy:</span>
                       <span className="text-xs font-black text-[#52814d] xl:text-sm">98.5%</span>
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

        {/* Text Container - Điều chỉnh chính xác padding để cách HUD đúng 80px (4 ô ly vở) */}
        <div className="relative z-10 w-full px-5 py-20 sm:px-8 lg:pl-[352px] xl:pl-[412px] 2xl:pl-[calc(3vw+420px)]">
          <div key={`copy-${activePlant.id}`} className="nature-banner-copy max-w-[620px]" aria-live={isPaused ? 'polite' : 'off'}>
            <h1 className="mt-7 text-[clamp(2.7rem,5vw,4.7rem)] font-extrabold leading-[1.12] tracking-[-.045em] text-[#173e2a] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
              Hiểu lá {bannerNames[activePlant.id]}.<br /><span className="bg-gradient-to-r from-[#245c3a] to-[#52814d] bg-clip-text text-transparent">Chăm mùa màng.</span>
            </h1>
            <p className="mt-6 text-base font-medium leading-8 text-[#3c5440] sm:text-lg">
              {bannerDescriptions[activePlant.id]}
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <button type="button" onClick={() => onNavigate('diagnose')} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#245c3a] px-8 text-base font-semibold text-white shadow-[0_16px_32px_rgba(24,71,39,.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#1c4b2e] hover:shadow-[0_20px_40px_rgba(24,71,39,.35)]">
                <Camera className="h-5 w-5" /> Thử giao diện chẩn đoán <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onSelectPlant(activePlant)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-[#b8cdb1] bg-white/80 px-7 text-base font-bold text-[#245c3a] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                Khám phá {bannerNames[activePlant.id]}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="nature-intro-section mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <img className="nature-intro-leaf" src="/images/rice-leaf-cutout.png" alt="" aria-hidden="true" loading="lazy" />
        <div className="max-w-2xl" data-reveal>
          <span className="text-sm font-bold uppercase tracking-[.2em] text-[#66864d]">Dễ bắt đầu ngay tại vườn</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#173e2a] sm:text-4xl">Ba bước gần gũi, dễ làm</h2>
          <p className="mt-4 text-base leading-7 text-[#607163]">Bắt đầu từ ảnh lá bạn chụp. Bản demo kiểm tra tệp và hiển thị phản hồi giả lập từ backend trong lúc mô hình được hoàn thiện.</p>
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
            <span className="text-3xl font-black text-[#245c3a]">10+</span>
            <span className="text-xs font-bold text-[#607163]">Loài cây</span>
          </div>
          <div className="absolute bottom-1/4 left-2 flex animate-bounce flex-col items-center gap-1 rounded-2xl border border-[#dce6d5] bg-white/95 p-4 shadow-xl backdrop-blur-md sm:left-6" style={{ animationDuration: '5s', animationDelay: '1s' }}>
            <span className="text-3xl font-black text-[#245c3a]">95%</span>
            <span className="text-xs font-bold text-[#607163]">Chính xác</span>
          </div>
        </div>
        <div data-reveal className="nature-story-copy"><span className="text-sm font-bold uppercase tracking-[.2em] text-[#66864d]">Đồng hành cùng cây trồng</span><h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#173e2a] sm:text-4xl">Một bức ảnh rõ bắt đầu từ sự quan sát kỹ.</h2><p className="mt-5 text-base leading-8 text-[#607163]">Mỗi loại cây có hình dạng lá và dấu hiệu bệnh khác nhau. LeafAI được thiết kế để bạn dễ chụp ảnh, xem lại thông tin và trao đổi với người có chuyên môn khi cần.</p><button type="button" onClick={() => onNavigate('diseases')} className="nature-story-link mt-7 inline-flex items-center gap-2 font-semibold text-[#245c3a]">Tìm hiểu thư viện bệnh lá <ArrowRight className="h-4 w-4" /></button></div>
      </section>
    </div>
  );
};
