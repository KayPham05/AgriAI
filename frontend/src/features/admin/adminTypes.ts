import type { AuthUser } from '@/services/authApi';

export interface AdminSummary {
  userCount: number;
  imageCount: number;
  sessionCount: number;
}
export interface AdminDailyActivity {
  date: string;
  userCount: number;
  imageCount: number;
  sessionCount: number;
}
export interface AdminActivity {
  timeZone: string;
  days: AdminDailyActivity[];
}
export interface AdminImage {
  id: string;
  predictionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  imageUrl: string | null;
  uploadedAt: string;
  expiresAt: string;
  status: 'Available' | 'Expired' | 'Deleted';
}
export interface AdminSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
  status: 'Active' | 'Expired' | 'Ended';
}
export interface AdminUser extends AuthUser {
  isLocked: boolean;
  lockedAt: string | null;
  lockReason: string | null;
  warningCount: number;
}
