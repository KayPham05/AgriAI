'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Plant, Disease, UserProfile, DiagnosisResult, Toast } from '@/types';
import { SUPPORTED_PLANTS, ALL_DISEASES } from '@/data/plantData';
import {
  type AuthSession,
  clearAuthSession,
  restoreAuthSession,
  logoutSession,
} from '@/services/authApi';
import { getPlants, getDiseases } from '@/services/catalogApi';
import {
  getPredictionHistory,
  deletePrediction,
  getPredictionById,
} from '@/services/predictionApi';
import { LoginModal } from '@/components/modals/LoginModal';
import { NotificationsModal } from '@/components/modals/NotificationsModal';
import { HistoryDetailModal } from '@/components/modals/HistoryDetailModal';
import { ToastContainer } from '@/components/common/ToastContainer';
import { AppSplashScreen } from '@/components/common/AppSplashScreen';
import { LoginSuccessScreen } from '@/components/common/LoginSuccessScreen';
import { AuthContext, CatalogContext, HistoryContext, FeedbackContext } from './AppContexts';
import { guestProfile, createUserProfile, readGuestHistory } from './sessionProfile';
import { useAccountNotifications } from './useAccountNotifications';

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const returnPathRef = useRef<string | null>(null);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  // true while restoreAuthSession() is in-flight — prevents IntroPage flash on reload
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  // Wait for startup data and the finite brand entrance before entering the app
  const [loginPendingSession, setLoginPendingSession] = useState<AuthSession | null>(null);
  const [startupError, setStartupError] = useState('');
  const [startupData, setStartupData] = useState<[Plant[], Disease[], DiagnosisResult[]] | null>(
    null,
  );
  const [entranceReady, setEntranceReady] = useState(false);
  const finishEntrance = useCallback(() => setEntranceReady(true), []);
  const [authEntryMode, setAuthEntryMode] = useState<'login' | 'register'>('login');

  // Navigation

  const [plants, setPlants] = useState<Plant[]>(SUPPORTED_PLANTS);
  const [diseases, setDiseases] = useState<Disease[]>(ALL_DISEASES);
  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(guestProfile);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  // Notifications

  // Diagnosis History with LocalStorage Persistence
  const [history, setHistory] = useState<DiagnosisResult[]>([]);
  const [isHistoryReady, setIsHistoryReady] = useState(false);

  useEffect(() => {
    setHistory(readGuestHistory());
    setIsHistoryReady(true);
  }, []);

  // Sync history to localStorage
  useEffect(() => {
    if (!isHistoryReady || authSession) return;
    try {
      localStorage.setItem('leafai_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history, isHistoryReady, authSession]);

  useEffect(() => {
    let isActive = true;
    restoreAuthSession().then((session) => {
      if (!isActive) return;
      if (session) {
        setLoginPendingSession(session);
      }
      // Always mark restore as done so the correct UI is shown
      setIsRestoringSession(false);
    });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!loginPendingSession) return;
    if (loginPendingSession.user.role === 'Admin' && pathname === '/') {
      return;
    }
    let isActive = true;
    setStartupData(null);
    setStartupError('');
    const timeout = setTimeout(() => {
      if (isActive) {
        isActive = false;
        setStartupError('Kết nối quá lâu. Vui lòng thử lại.');
      }
    }, 15000);
    Promise.all([getPlants(), getDiseases(), getPredictionHistory(loginPendingSession.token)])
      .then((data) => {
        if (isActive) setStartupData(data);
      })
      .catch((error) => {
        if (isActive)
          setStartupError(error instanceof Error ? error.message : 'Không thể kết nối.');
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      isActive = false;
      clearTimeout(timeout);
    };
  }, [loginPendingSession, pathname]);

  useEffect(() => {
    if (loginPendingSession?.user.role === 'Admin' && pathname === '/' && entranceReady) {
      router.replace('/admin');
    }
  }, [loginPendingSession, pathname, entranceReady, router]);

  useEffect(() => {
    if (!loginPendingSession || !startupData || !entranceReady) return;
    setPlants(startupData[0]);
    setDiseases(startupData[1]);
    setHistory(startupData[2]);
    setAuthSession(loginPendingSession);
    setUserProfile(createUserProfile(loginPendingSession));
    if (pathname === '/') router.replace(returnPathRef.current ?? '/home');
    setLoginPendingSession(null);
    setHasEnteredApp(true);
  }, [loginPendingSession, startupData, entranceReady, pathname, router]);

  useEffect(() => {
    if (isRestoringSession || loginPendingSession) return;
    if (!hasEnteredApp && pathname !== '/') {
      returnPathRef.current = pathname;
      router.replace('/');
    } else if (hasEnteredApp && pathname === '/') {
      router.replace(returnPathRef.current ?? '/home');
    } else if (hasEnteredApp) {
      returnPathRef.current = null;
    }
  }, [isRestoringSession, loginPendingSession, hasEnteredApp, pathname, router]);

  // Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [historyDetailResult, setHistoryDetailResult] = useState<DiagnosisResult | null>(null);
  const expireSession = useCallback(() => {
    clearAuthSession();
    setAuthSession(null);
    setUserProfile(guestProfile);
    setHistory(readGuestHistory());
    setHasEnteredApp(false);
    setIsNotificationsOpen(false);
    returnPathRef.current = null;
    router.replace('/');
  }, [router]);
  const accountNotifications = useAccountNotifications(
    authSession?.token,
    isNotificationsOpen,
    expireSession,
  );
  const notifications = accountNotifications.notifications;

  const openAuthentication = useCallback((mode: 'login' | 'register') => {
    setAuthEntryMode(mode);
    setIsLoginOpen(true);
  }, []);

  // Toast dispatch helper
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Notification actions

  // History Actions
  const handleDeleteHistoryItem = useCallback(
    async (id: string) => {
      try {
        if (authSession) await deletePrediction(id, authSession.token);
        setHistory((prev) => prev.filter((item) => item.id !== id));
        addToast({
          type: 'info',
          title: 'Đã xóa bản ghi',
          message: authSession
            ? 'Kết quả đã được xóa khỏi tài khoản.'
            : 'Kết quả đã được xóa khỏi trình duyệt.',
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Không thể xóa kết quả',
          message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        });
      }
    },
    [authSession, addToast],
  );

  const handleViewHistoryItem = useCallback(
    async (result: DiagnosisResult) => {
      if (!authSession) {
        setHistoryDetailResult(result);
        setIsHistoryDetailOpen(true);
        return;
      }
      try {
        const details = await getPredictionById(result.id, authSession.token);
        setHistoryDetailResult(details);
        setIsHistoryDetailOpen(true);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Không thể tải chi tiết',
          message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        });
      }
    },
    [authSession, addToast],
  );

  const handleAuthSuccess = useCallback((session: AuthSession) => {
    // Wait for real startup data and the finite brand entrance before entering home.
    setEntranceReady(false);
    setStartupData(null);
    setStartupError('');
    setLoginPendingSession(session);
    setIsLoginOpen(false);
  }, []);

  const logout = useCallback(() => {
    if (authSession) {
      void logoutSession(authSession.token).catch(() => {
        addToast({
          type: 'error',
          title: 'Chưa thể đóng phiên trên máy chủ',
          message:
            'Đã đăng xuất trên thiết bị này. Phiên trên máy chủ sẽ còn hiệu lực đến khi hết hạn.',
        });
      });
    }
    clearAuthSession();
    setAuthSession(null);
    setUserProfile(guestProfile);
    setHistory(readGuestHistory());
    returnPathRef.current = null;
    router.replace('/');
    setHasEnteredApp(false);
  }, [router, authSession, addToast]);
  const updateProfile = useCallback(
    (updated: UserProfile) => {
      setUserProfile(updated);
      addToast({
        type: 'success',
        title: 'Đã cập nhật thông tin hiển thị',
        message: 'Thay đổi chỉ được giữ trong phiên hiện tại, chưa lưu vào tài khoản.',
      });
    },
    [addToast],
  );
  const addPrediction = useCallback(
    (result: DiagnosisResult) =>
      setHistory((current) => [result, ...current.filter((item) => item.id !== result.id)]),
    [],
  );
  const openNotifications = useCallback(() => setIsNotificationsOpen(true), []);
  const catalog = useMemo(() => ({ plants, diseases }), [plants, diseases]);
  const auth = useMemo(
    () => ({
      session: authSession,
      profile: userProfile,
      openAuthentication,
      logout,
      updateProfile,
    }),
    [authSession, userProfile, openAuthentication, logout, updateProfile],
  );
  const historyState = useMemo(
    () => ({
      history,
      addPrediction,
      deleteHistoryItem: handleDeleteHistoryItem,
      viewHistoryItem: handleViewHistoryItem,
    }),
    [history, addPrediction, handleDeleteHistoryItem, handleViewHistoryItem],
  );
  const feedback = useMemo(
    () => ({ notifications, openNotifications }),
    [notifications, openNotifications],
  );

  if (isRestoringSession) return <AppSplashScreen />;
  if (loginPendingSession) {
    return (
      <LoginSuccessScreen
        userName={loginPendingSession.user.fullName}
        onAnimationComplete={finishEntrance}
        error={startupError}
        onRetry={() => setLoginPendingSession((session) => (session ? { ...session } : null))}
        onCancel={() => {
          clearAuthSession();
          setLoginPendingSession(null);
          setStartupData(null);
          setEntranceReady(false);
          returnPathRef.current = null;
          router.replace('/');
        }}
      />
    );
  }
  // UI gate only. The API remains responsible for authorization.
  if (!hasEnteredApp && pathname !== '/') return <AppSplashScreen />;

  return (
    <AuthContext value={auth}>
      <CatalogContext value={catalog}>
        <HistoryContext value={historyState}>
          <FeedbackContext value={feedback}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
            <LoginModal
              isOpen={isLoginOpen}
              initialMode={authEntryMode}
              onClose={() => setIsLoginOpen(false)}
              onAuthSuccess={handleAuthSuccess}
            />
            <NotificationsModal
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              notifications={notifications}
              onMarkAllRead={accountNotifications.markAllRead}
              onClearAll={accountNotifications.clearAll}
              error={accountNotifications.error}
              busy={accountNotifications.busy}
              loading={accountNotifications.loading}
              onRetry={accountNotifications.retry}
            />
            <HistoryDetailModal
              isOpen={isHistoryDetailOpen}
              result={historyDetailResult}
              onClose={() => setIsHistoryDetailOpen(false)}
              onAnalyzeNew={() => {
                setIsHistoryDetailOpen(false);
                router.push('/diagnose');
              }}
            />
          </FeedbackContext>
        </HistoryContext>
      </CatalogContext>
    </AuthContext>
  );
}
