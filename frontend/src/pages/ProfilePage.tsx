import React, { useState } from 'react';
import { 
  Mail, 
  MapPin, 
  Calendar, 
  Activity, 
  Leaf, 
  CheckCircle2, 
  AlertTriangle,
  Edit2,
  Check
} from 'lucide-react';
import { UserProfile, DiagnosisResult } from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  history: DiagnosisResult[];
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenLogin: () => void;
}

export const ProfilePage: React.FC<ProfileViewProps> = ({
  profile,
  history,
  onUpdateProfile,
  onOpenLogin,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [location, setLocation] = useState(profile.location);

  // Derive genuine statistics backed by real history data
  const totalDiagnoses = history.length;
  const diseasedCount = history.filter((h) => !h.isHealthy).length;
  const healthyCount = history.filter((h) => h.isHealthy).length;

  // Most scanned plant
  const plantCounts: Record<string, number> = {};
  history.forEach((h) => {
    plantCounts[h.plant] = (plantCounts[h.plant] || 0) + 1;
  });
  let mostScannedPlant = 'Chưa có';
  let maxCount = 0;
  Object.entries(plantCounts).forEach(([plant, count]) => {
    if (count > maxCount) {
      mostScannedPlant = plant;
      maxCount = count;
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name,
      role,
      location,
    });
    setIsEditing(false);
  };

  return (
    <div className="soft-page max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="border-b border-[#E2E8E4] pb-6">
        <h1 className="font-display font-bold text-3xl text-[#17211B]">Hồ sơ dùng thử</h1>
        <p className="text-sm text-[#647067] mt-1">
          Hồ sơ này chỉ hoạt động trong bản demo. Lịch sử mẫu được lưu trên trình duyệt của bạn.
        </p>
      </div>

      {/* User Information Card */}
      <div className="soft-workspace-card bg-white rounded-3xl border border-[#E2E8E4] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          
          <div className="flex items-center gap-5">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-3xl font-bold text-emerald-800" aria-hidden="true">L</div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xl sm:text-2xl text-[#17211B]">{profile.name}</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Bản demo
                </span>
              </div>
              <p className="text-xs font-medium text-emerald-800">{profile.role}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#647067] pt-1">
                {profile.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /><span>{profile.email}</span></span>}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.location}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Tham gia: {profile.joinedDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 border border-[#E2E8E4] hover:bg-[#F8FAF9] text-[#17211B] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isEditing ? 'Hủy chỉnh sửa' : 'Sửa thông tin'}</span>
            </button>
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Xem hồ sơ mẫu
            </button>
          </div>

        </div>

        {/* Edit Form Drawer */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-[#E2E8E4] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#17211B] mb-1">Họ và tên</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block font-medium text-[#17211B] mb-1">Vai trò / Chuyên ngành</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block font-medium text-[#17211B] mb-1">Khu vực canh tác / Trạm</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Diagnosis Statistics */}
      <div className="space-y-4">
        <div>
          <h3 className="font-display font-bold text-xl text-[#17211B]">
             Thống kê mẫu đã lưu
          </h3>
          <p className="text-xs text-[#647067] mt-0.5">
             Các số dưới đây chỉ tính từ mẫu minh họa bạn lưu trong trình duyệt này.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Card 1: Total Diagnoses */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-[#647067]">
              <span className="text-xs font-semibold uppercase tracking-wider">Tổng lượt quét</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-display font-bold text-3xl text-[#17211B] pt-1">
              {totalDiagnoses}
            </p>
            <p className="text-[11px] text-[#647067]">Phiếu kiểm định</p>
          </div>

          {/* Card 2: Diseased Leaves */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-[#647067]">
               <span className="text-xs font-semibold uppercase tracking-wider">Mẫu bệnh</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="font-display font-bold text-3xl text-rose-600 pt-1">
              {diseasedCount}
            </p>
             <p className="text-[11px] text-[#647067]">Theo nhãn minh họa</p>
          </div>

          {/* Card 3: Healthy Leaves */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-[#647067]">
              <span className="text-xs font-semibold uppercase tracking-wider">Lá khỏe mạnh</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-display font-bold text-3xl text-emerald-700 pt-1">
              {healthyCount}
            </p>
             <p className="text-[11px] text-[#647067]">Theo nhãn minh họa</p>
          </div>

          {/* Card 4: Most Scanned Plant */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8E4] space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-[#647067]">
              <span className="text-xs font-semibold uppercase tracking-wider">Cây kiểm tra nhiều</span>
              <Leaf className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="font-display font-bold text-2xl text-[#17211B] pt-1 truncate">
              {mostScannedPlant}
            </p>
            <p className="text-[11px] text-[#647067]">Giống cây phân tích nhiều nhất</p>
          </div>

        </div>
      </div>

      {/* Account Settings & App Metadata */}
      <div className="bg-[#F8FAF9] rounded-2xl p-6 border border-[#E2E8E4] space-y-4">
        <h3 className="font-display font-bold text-sm text-[#17211B]">Trạng thái hệ thống</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
             <span className="text-[#647067]">Bộ phân loại ảnh</span>
             <p className="font-semibold text-[#17211B] mt-0.5">Chưa kết nối</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
             <span className="text-[#647067]">Grad-CAM</span>
             <p className="font-semibold text-[#17211B] mt-0.5">Chỉ minh họa giao diện</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E4]">
             <span className="text-[#647067]">Lưu lịch sử</span>
             <p className="font-semibold text-[#17211B] mt-0.5">Trên trình duyệt này</p>
          </div>
        </div>
      </div>

    </div>
  );
};
