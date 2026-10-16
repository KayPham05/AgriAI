'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AdminActivity, AdminImage, AdminSession, AdminUser } from './adminTypes';
import { vietnamToday } from './AdminCalendar';
import leafPhoto from '@/assets/banner/bưởi banner.jpg';

interface MockData {
  users: AdminUser[];
  images: AdminImage[];
  sessions: AdminSession[];
  activity: AdminActivity;
}

function createMockData(): MockData {
  const today = vietnamToday();
  const midnight = new Date(`${today}T00:00:00+07:00`);
  const names = [
    'Nguyễn Văn An',
    'Trần Thị Bình',
    'Lê Minh Châu',
    'Phạm Quốc Dũng',
    'Võ Thị Hạnh',
    'Đặng Minh Khoa',
    'Bùi Thị Lan',
    'Đỗ Hoàng Nam',
    'Hồ Ngọc Phương',
    'Ngô Đức Sơn',
    'Dương Thị Thảo',
    'Lý Văn Tùng',
  ];
  const users = names.map(
    (fullName, index): AdminUser => ({
      id: `mock-user-${index + 1}`,
      fullName,
      email: index === 0 ? 'an@example.test' : `nguoidung${index + 1}@example.test`,
      role: 'User',
      createdAt: new Date(midnight.getTime() - index * 86400000).toISOString(),
      isLocked: false,
      lockedAt: null,
      lockReason: null,
      warningCount: 0,
    }),
  );
  const images = users.slice(0, 3).map(
    (user, index): AdminImage => ({
      id: `mock-image-${index + 1}`,
      predictionId: `mock-prediction-${index + 1}`,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      imageUrl: index === 0 ? leafPhoto.src : null,
      uploadedAt: user.createdAt,
      expiresAt: new Date(midnight.getTime() + (index === 1 ? -43200000 : 86400000)).toISOString(),
      status: index === 0 ? 'Available' : index === 1 ? 'Expired' : 'Deleted',
    }),
  );
  const sessions = users.slice(0, 3).map(
    (user, index): AdminSession => ({
      id: `mock-session-${index + 1}`,
      userId: user.id,
      userName: user.fullName,
      userEmail: user.email,
      createdAt: user.createdAt,
      expiresAt: new Date(midnight.getTime() + (index === 2 ? -86400000 : 86400000)).toISOString(),
      endedAt: index === 1 ? user.createdAt : null,
      status: index === 0 ? 'Active' : index === 1 ? 'Ended' : 'Expired',
    }),
  );
  return {
    users,
    images,
    sessions,
    activity: {
      timeZone: 'Asia/Ho_Chi_Minh',
      days: Array.from({ length: 7 }, (_, index) => {
        const date = vietnamToday(new Date(midnight.getTime() - (6 - index) * 86400000));
        return {
          date,
          userCount: users.filter((user) => vietnamToday(new Date(user.createdAt)) === date).length,
          imageCount: images.filter((image) => vietnamToday(new Date(image.uploadedAt)) === date)
            .length,
          sessionCount: sessions.filter(
            (session) => vietnamToday(new Date(session.createdAt)) === date,
          ).length,
        };
      }),
    },
  };
}

type AccountAction = 'lock' | 'restore' | 'logout-all' | 'warnings';
interface MockContextValue extends MockData {
  moderateAccount: (id: string, action: AccountAction, message: string) => void;
  moderateImage: (id: string, action: 'delete' | 'warnings', message: string) => void;
}
const MockContext = createContext<MockContextValue | null>(null);

export function AdminMockProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(createMockData);
  function moderateAccount(id: string, action: AccountAction, message: string) {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      users: current.users.map((user) => {
        if (user.id !== id) return user;
        if (action === 'warnings') return { ...user, warningCount: user.warningCount + 1 };
        if (action === 'logout-all') return user;
        return {
          ...user,
          isLocked: action === 'lock',
          lockedAt: action === 'lock' ? now : null,
          lockReason: action === 'lock' ? message : null,
        };
      }),
      sessions:
        action === 'lock' || action === 'logout-all'
          ? current.sessions.map((session) =>
              session.userId === id && session.status === 'Active'
                ? { ...session, status: 'Ended', endedAt: now }
                : session,
            )
          : current.sessions,
    }));
  }
  function moderateImage(id: string, action: 'delete' | 'warnings', message: string) {
    if (action === 'warnings') {
      const image = data.images.find((item) => item.id === id);
      if (image) moderateAccount(image.userId, 'warnings', message);
      return;
    }
    setData((current) => ({
      ...current,
      images: current.images.map((image) =>
        image.id === id ? { ...image, status: 'Deleted', imageUrl: null } : image,
      ),
    }));
  }
  return <MockContext value={{ ...data, moderateAccount, moderateImage }}>{children}</MockContext>;
}

export function useAdminMock() {
  const context = useContext(MockContext);
  if (!context) throw new Error('Admin mock data requires AdminMockProvider.');
  return context;
}
