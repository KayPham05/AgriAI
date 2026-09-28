import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  Edit2,
  Leaf,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { DiagnosisResult, UserProfile } from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  history: DiagnosisResult[];
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenLogin: () => void;
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfileViewProps> = ({
  profile,
  history,
  onUpdateProfile,
  onOpenLogin,
  isAuthenticated,
  onLogout,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [location, setLocation] = useState(profile.location);

  const totalDiagnoses = history.length;
  const diseasedCount = history.filter((item) => !item.isHealthy).length;
  const healthyCount = history.filter((item) => item.isHealthy).length;
  const healthyRate = totalDiagnoses > 0 ? Math.round((healthyCount / totalDiagnoses) * 100) : 0;
  const plantCounts = history.reduce<Record<string, number>>(
    (counts, item) => ({ ...counts, [item.plant]: (counts[item.plant] ?? 0) + 1 }),
    {},
  );
  const mostScannedPlant = Object.entries(plantCounts).reduce(
    (mostFrequent, current) => current[1] > mostFrequent[1] ? current : mostFrequent,
    ['Chưa có', 0] as [string, number],
  )[0];
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase() || 'L';

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    onUpdateProfile({ ...profile, name, role, location });
    setIsEditing(false);
  };

  return (
    <div className="profile-premium min-h-screen bg-[#f4f6ef] pb-20">
      <section className="relative min-h-[300px] overflow-hidden bg-[#0c2819] text-white sm:min-h-[340px]">
        <img src="/images/vietnam-coffee-plant.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-25 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(7,29,17,.98),rgba(12,48,28,.88)_55%,rgba(12,40,25,.58))]" />
        <div className="intro-grid absolute inset-0 opacity-25" />
        <div className="absolute -right-24 -top-32 h-[430px] w-[430px] rounded-full bg-[#9fd071]/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7e9a6]/20 bg-[#c7e9a6]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-[#c9e9aa] backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5" /> Không gian cá nhân
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">
            {isAuthenticated ? 'Hồ sơ của tôi' : 'Hồ sơ dùng thử'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            {isAuthenticated
              ? 'Tổng quan tài khoản, hoạt động chẩn đoán và tình trạng kết nối LeafAI của bạn.'
              : 'Đăng nhập để đồng bộ tài khoản và tiếp tục công việc trên các thiết bị khác.'}
          </p>
        </div>
      </section>

      <main className="relative z-20 mx-auto -mt-16 max-w-7xl space-y-8 px-5 sm:-mt-20 sm:px-8 lg:px-12">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[#fffef9]/95 shadow-[0_30px_80px_rgba(24,64,34,.15)] backdrop-blur-xl sm:rounded-[38px]">
          <div className="h-1.5 bg-gradient-to-r from-[#6f9f58] via-[#c3e29f] to-[#d6bc7e]" />
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
                <div className="relative shrink-0">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.name} className="h-24 w-24 rounded-[28px] border-4 border-white object-cover shadow-[0_18px_40px_rgba(28,78,40,.2)] sm:h-28 sm:w-28" />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-[28px] border-4 border-white bg-gradient-to-br from-[#dff0d3] to-[#bcdba9] text-3xl font-black text-[#245c3a] shadow-[0_18px_40px_rgba(28,78,40,.2)] sm:h-28 sm:w-28" aria-hidden="true">{initials}</div>
                  )}
                  <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-4 border-[#fffef9] bg-[#245c3a] text-white"><Check className="h-4 w-4" /></span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="break-words text-2xl font-black tracking-[-.035em] text-[#173e2a] sm:text-3xl">{profile.name}</h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c8dec0] bg-[#edf5e8] px-3 py-1 text-[10px] font-black uppercase tracking-[.1em] text-[#3f7343]">
                      <ShieldCheck className="h-3.5 w-3.5" /> {isAuthenticated ? 'Đã đăng nhập' : 'Bản demo'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#56804e]">{profile.role}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#68766a]">
                    {profile.email && <span className="inline-flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-[#779b6e]" /><span className="break-all">{profile.email}</span></span>}
                    <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#779b6e]" /> {profile.location}</span>
                    <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4 text-[#779b6e]" /> Tham gia {profile.joinedDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button type="button" onClick={() => setIsEditing((current) => !current)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#d7e4d2] bg-white px-5 text-sm font-bold text-[#24472e] shadow-sm transition hover:-translate-y-0.5 hover:border-[#acc9a3] hover:shadow-md">
                  <Edit2 className="h-4 w-4 text-[#57904f]" /> {isEditing ? 'Đóng chỉnh sửa' : 'Sửa thông tin'}
                </button>
                {isAuthenticated ? (
                  <button type="button" onClick={onLogout} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"><LogOut className="h-4 w-4" /> Đăng xuất</button>
                ) : (
                  <button type="button" onClick={onOpenLogin} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#245c3a] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(36,92,58,.2)] transition hover:-translate-y-0.5 hover:bg-[#194b2e]"><LogIn className="h-4 w-4" /> Đăng nhập / Đăng ký</button>
                )}
              </div>
            </div>

            {isEditing && (
              <form onSubmit={handleSave} className="mt-8 grid gap-5 border-t border-[#e5ede1] pt-8 sm:grid-cols-3">
                <ProfileField label="Họ và tên" value={name} onChange={setName} icon={UserRound} />
                <ProfileField label="Vai trò / Chuyên ngành" value={role} onChange={setRole} icon={Leaf} />
                <ProfileField label="Khu vực canh tác / Trạm" value={location} onChange={setLocation} icon={MapPin} />
                <div className="flex justify-end sm:col-span-3">
                  <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#245c3a] px-6 text-sm font-bold text-white shadow-[0_12px_26px_rgba(36,92,58,.18)] transition hover:bg-[#194b2e]"><Check className="h-4 w-4" /> Lưu thay đổi</button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#659057]"><BarChart3 className="h-4 w-4" /> Hoạt động của bạn</span>
              <h3 className="mt-2 text-2xl font-black tracking-[-.035em] text-[#173e2a]">Thống kê mẫu đã lưu</h3>
              <p className="mt-1 text-sm text-[#6a786c]">Dữ liệu được tổng hợp trực tiếp từ lịch sử chẩn đoán hiện có.</p>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-[#d5e3d0] bg-white px-4 py-2 text-xs font-bold text-[#5f725f] shadow-sm sm:self-auto"><Activity className="h-4 w-4 text-[#57904f]" /> Cập nhật theo thời gian thực</span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={ScanLine} label="Tổng lượt quét" value={String(totalDiagnoses)} note="Phiếu chẩn đoán đã lưu" accent="#4f8650" glow="rgba(79,134,80,.13)" />
            <MetricCard icon={AlertTriangle} label="Mẫu có bệnh" value={String(diseasedCount)} note="Cần tiếp tục theo dõi" accent="#dc5b55" glow="rgba(220,91,85,.12)" />
            <MetricCard icon={CheckCircle2} label="Lá khỏe mạnh" value={String(healthyCount)} note={`${healthyRate}% tổng số mẫu`} accent="#2e9270" glow="rgba(46,146,112,.12)" />
            <MetricCard icon={Leaf} label="Cây kiểm tra nhiều" value={mostScannedPlant} note="Nhóm cây xuất hiện nhiều nhất" accent="#b27d32" glow="rgba(178,125,50,.12)" compact />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[30px] border border-[#d8e6d2] bg-[#fffef9] p-6 shadow-[0_18px_48px_rgba(30,70,38,.07)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#69925d]">Tổng quan mẫu</p><h3 className="mt-2 text-xl font-black text-[#173e2a]">Tình trạng lá đã phân tích</h3></div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f1e2] text-[#4f8650]"><Activity className="h-6 w-6" /></span>
            </div>

            <div className="mt-8">
              <div className="flex h-3 overflow-hidden rounded-full bg-[#edf1e9]">
                {totalDiagnoses > 0 && <><span className="h-full bg-[#3f9b70] transition-all" style={{ width: `${healthyRate}%` }} /><span className="h-full bg-[#dd6a61] transition-all" style={{ width: `${100 - healthyRate}%` }} /></>}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#edf7f0] p-4"><span className="flex items-center gap-2 text-xs font-bold text-[#397a5c]"><span className="h-2.5 w-2.5 rounded-full bg-[#3f9b70]" /> Khỏe mạnh</span><strong className="mt-2 block text-2xl font-black text-[#173e2a]">{healthyCount}</strong></div>
                <div className="rounded-2xl bg-[#fff1ef] p-4"><span className="flex items-center gap-2 text-xs font-bold text-[#af514b]"><span className="h-2.5 w-2.5 rounded-full bg-[#dd6a61]" /> Có dấu hiệu bệnh</span><strong className="mt-2 block text-2xl font-black text-[#173e2a]">{diseasedCount}</strong></div>
              </div>
              {totalDiagnoses === 0 && <p className="mt-5 text-sm leading-7 text-[#748076]">Chưa có dữ liệu để trực quan hóa. Hãy thực hiện lần kiểm tra lá đầu tiên.</p>}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] bg-[#173e2a] p-6 text-white shadow-[0_24px_55px_rgba(23,62,42,.18)] sm:p-8">
            <div className="intro-grid absolute inset-0 opacity-20" />
            <img src="/images/coffee-foliage-cutout.png" alt="" className="absolute -bottom-16 -right-14 w-56 opacity-10" />
            <div className="relative z-10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#c6e7a5]"><Leaf className="h-6 w-6" /></span>
              <p className="mt-8 text-[10px] font-black uppercase tracking-[.18em] text-[#b8da98]">Gợi ý tiếp theo</p>
              <h3 className="mt-3 text-2xl font-black leading-tight text-white">Tiếp tục xây dựng nhật ký sức khỏe cây trồng.</h3>
              <p className="mt-4 text-sm leading-7 text-white/55">Mỗi mẫu được lưu giúp bạn dễ dàng xem lại sự thay đổi của cây theo thời gian.</p>
              <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#c9eaa9] transition hover:gap-3">Xem lại hồ sơ <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#d8e5d2] bg-[#eef3ea] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#69925d]">Hạ tầng LeafAI</p><h3 className="mt-2 text-xl font-black text-[#173e2a]">Trạng thái hệ thống</h3></div>
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#dcebd5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-[#437548] sm:self-auto"><span className="h-2 w-2 rounded-full bg-[#4c9b58] shadow-[0_0_10px_#6fbe76]" /> Sẵn sàng</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <SystemCard icon={Cpu} title="Bộ phân loại ảnh" value="Kết nối qua ASP.NET API" />
            <SystemCard icon={Sparkles} title="Grad-CAM" value="Đang phát triển" />
            <SystemCard icon={Database} title="Lưu lịch sử" value={isAuthenticated ? 'Đồng bộ với tài khoản' : 'Trên trình duyệt này'} />
          </div>
        </section>
      </main>
    </div>
  );
};

interface ProfileFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ElementType;
}

const ProfileField: React.FC<ProfileFieldProps> = ({ label, value, onChange, icon: Icon }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-bold text-[#284431]">{label}</span>
    <span className="flex items-center gap-3 rounded-2xl border border-[#dbe7d6] bg-[#f7faf4] px-4 py-3 text-[#759071] focus-within:border-[#6f9f67] focus-within:ring-4 focus-within:ring-[#6f9f67]/10">
      <Icon className="h-4 w-4 shrink-0" />
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#173e2a] outline-none" />
    </span>
  </label>
);

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  note: string;
  accent: string;
  glow: string;
  compact?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, note, accent, glow, compact = false }) => (
  <article className="group relative overflow-hidden rounded-[26px] border border-[#d9e6d4] bg-[#fffef9] p-5 shadow-[0_16px_42px_rgba(30,70,38,.065)] transition hover:-translate-y-1 hover:shadow-[0_24px_52px_rgba(30,70,38,.12)] sm:p-6">
    <span className="absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition group-hover:scale-125" style={{ background: glow }} />
    <div className="relative flex items-start justify-between gap-4">
      <span className="text-[10px] font-black uppercase tracking-[.13em] text-[#718073]">{label}</span>
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ color: accent, background: glow }}><Icon className="h-[18px] w-[18px]" /></span>
    </div>
    <strong className={`relative mt-5 block truncate font-black tracking-[-.04em] text-[#173e2a] ${compact ? 'text-2xl' : 'text-4xl'}`}>{value}</strong>
    <p className="relative mt-2 text-[11px] text-[#748076]">{note}</p>
  </article>
);

interface SystemCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
}

const SystemCard: React.FC<SystemCardProps> = ({ icon: Icon, title, value }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-[#d8e5d2] bg-[#fffef9] p-4 shadow-sm">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e4efde] text-[#4e804d]"><Icon className="h-5 w-5" /></span>
    <div><span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#7a877c]">{title}</span><strong className="mt-1 block text-xs leading-5 text-[#24472e]">{value}</strong></div>
  </div>
);
