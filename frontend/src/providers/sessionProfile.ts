import type { DiagnosisResult, UserProfile } from '@/types';
import type { AuthSession } from '@/services/authApi';

export const guestProfile: UserProfile = {
  name: 'Khách dùng thử',
  email: '',
  role: 'Hồ sơ trên thiết bị',
  location: 'Chưa thiết lập',
  joinedDate: 'Bản demo',
  avatarUrl: '',
};

export function createUserProfile(session: AuthSession): UserProfile {
  const joinedDate = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(session.user.createdAt));

  return {
    name: session.user.fullName,
    email: session.user.email,
    role: session.user.role === 'Admin' ? 'Quản trị viên' : 'Thành viên AgriAI',
    location: 'Chưa thiết lập',
    joinedDate,
    avatarUrl: '',
  };
}

export function readGuestHistory(): DiagnosisResult[] {
  try {
    const saved = localStorage.getItem('leafai_history');
    if (!saved) return [];
    const records = JSON.parse(saved);
    return Array.isArray(records)
      ? records.map((item: DiagnosisResult) => ({ ...item, isDemo: true }))
      : [];
  } catch (error) {
    console.warn('Could not read history from localStorage', error);
    return [];
  }
}
