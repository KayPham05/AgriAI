'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type {
  Plant,
  Disease,
  UserProfile,
  DiagnosisResult,
  Toast,
  NotificationItem,
} from '@/types';
import { SUPPORTED_PLANTS, ALL_DISEASES } from '@/data/plantData';
import {
  type AuthSession,
  type AuthUser,
  clearAuthSession,
  restoreAuthSession,
  revokeSession,
  updateStoredAuthUser,
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
import { AdminLoginSuccessScreen } from '@/features/admin/AdminLoginSuccessScreen';
import { SeedlingLoadingScreen } from '@/components/common/SeedlingLoadingScreen';
import { AuthContext, CatalogContext, HistoryContext, FeedbackContext } from './AppContexts';
import { guestProfile, createUserProfile, readGuestHistory } from './sessionProfile';

const AUTH_NOTICE_DURATION_MS = 4000;

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const returnPathRef = useRef<string | null>(null);
  const restoredStartupRef = useRef(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  // true while restoreAuthSession() is in-flight — prevents IntroPage flash on reload
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [logoutName, setLogoutName] = useState<string | null>(null);
  // Wait for startup data and the finite brand entrance before entering the app
  const [loginPendingSession, setLoginPendingSession] = useState<AuthSession | null>(null);
  const [startupError, setStartupError] = useState('');
  const [startupData, setStartupData] = useState<[Plant[], Disease[], DiagnosisResult[]] | null>(
    null,
  );
  const [entranceReady, setEntranceReady] = useState(false);
  const [noticeReady, setNoticeReady] = useState(false);
  const finishEntrance = useCallback(() => setEntranceReady(true), []);
  const [authEntryMode, setAuthEntryMode] = useState<'login' | 'register'>('login');

  // Navigation

  const [plants, setPlants] = useState<Plant[]>(SUPPORTED_PLANTS);
  const [diseases, setDiseases] = useState<Disease[]>(ALL_DISEASES);
  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(guestProfile);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

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
        restoredStartupRef.current = true;
        if (session.user.role === 'Admin') setEntranceReady(true);
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
    if (restoredStartupRef.current) {
      setNoticeReady(true);
      return;
    }
    setNoticeReady(false);
    const timer = window.setTimeout(() => setNoticeReady(true), AUTH_NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [loginPendingSession]);

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
    if (
      loginPendingSession?.user.role === 'Admin' &&
      pathname === '/' &&
      entranceReady &&
      noticeReady
    ) {
      router.replace('/admin');
    }
  }, [loginPendingSession, pathname, entranceReady, noticeReady, router]);

  useEffect(() => {
    if (
      !loginPendingSession ||
      !startupData ||
      !noticeReady ||
      (loginPendingSession.user.role === 'Admin' && !entranceReady)
    )
      return;
    setPlants(startupData[0]);
    setDiseases(startupData[1]);
    setHistory(startupData[2]);
    setAuthSession(loginPendingSession);
    setUserProfile(createUserProfile(loginPendingSession));
    if (pathname === '/') router.replace(returnPathRef.current ?? '/home');
    setLoginPendingSession(null);
    setHasEnteredApp(true);
    restoredStartupRef.current = false;
  }, [loginPendingSession, startupData, entranceReady, noticeReady, pathname, router]);

  useEffect(() => {
    if (isRestoringSession || loginPendingSession || logoutName !== null) return;
    if (!hasEnteredApp && pathname !== '/') {
      returnPathRef.current = pathname;
      router.replace('/');
    } else if (hasEnteredApp && pathname === '/') {
      router.replace(returnPathRef.current ?? '/home');
    } else if (hasEnteredApp) {
      returnPathRef.current = null;
    }
  }, [isRestoringSession, loginPendingSession, logoutName, hasEnteredApp, pathname, router]);

  useEffect(() => {
    if (logoutName === null || pathname !== '/') return;
    const timer = window.setTimeout(() => setLogoutName(null), AUTH_NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [logoutName, pathname]);

  // Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [historyDetailResult, setHistoryDetailResult] = useState<DiagnosisResult | null>(null);

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
    setNoticeReady(false);
    setStartupData(null);
    setStartupError('');
    setLoginPendingSession(session);
    setIsLoginOpen(false);
  }, []);

  const logoutPending = useRef(false);
  const logout = useCallback(async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    try {
      if (authSession) await revokeSession(authSession.token);
    } catch {
      addToast({
        type: 'error',
        title: 'Chưa thể đăng xuất',
        message: 'Không thể thu hồi phiên. Vui lòng kiểm tra kết nối và thử lại.',
      });
      return;
    } finally {
      logoutPending.current = false;
    }
    setLogoutName(authSession?.user.fullName ?? '');
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
  const updateAccount = useCallback((user: AuthUser) => {
    setAuthSession((current) => (current?.user.id === user.id ? { ...current, user } : current));
    setUserProfile((current) => ({
      ...current,
      name: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? '',
    }));
    updateStoredAuthUser(user);
  }, []);
  const openNotifications = useCallback(() => setIsNotificationsOpen(true), []);
  const catalog = useMemo(() => ({ plants, diseases }), [plants, diseases]);
  const auth = useMemo(
    () => ({
      session: authSession,
      profile: userProfile,
      openAuthentication,
      logout,
      updateProfile,
      updateAccount,
    }),
    [authSession, userProfile, openAuthentication, logout, updateProfile, updateAccount],
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

  if (logoutName !== null) return <SeedlingLoadingScreen mode="logout" userName={logoutName} />;
  if (isRestoringSession) return <AppSplashScreen />;
  if (loginPendingSession) {
    const startupProps = {
      userName: loginPendingSession.user.fullName,
      error: startupError,
      onRetry: () => setLoginPendingSession((session) => (session ? { ...session } : null)),
      onCancel: async () => {
        try {
          await revokeSession(loginPendingSession.token);
        } catch {
          setStartupError('Chưa thể thu hồi phiên. Vui lòng thử lại.');
          return;
        }
        clearAuthSession();
        restoredStartupRef.current = false;
        setLoginPendingSession(null);
        setStartupData(null);
        setEntranceReady(false);
        returnPathRef.current = null;
        router.replace('/');
      },
    };
    if (restoredStartupRef.current) return <AppSplashScreen {...startupProps} />;
    return loginPendingSession.user.role === 'Admin' ? (
      <AdminLoginSuccessScreen {...startupProps} onAnimationComplete={finishEntrance} />
    ) : (
      <SeedlingLoadingScreen {...startupProps} />
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
              onMarkAllRead={() =>
                setNotifications((items) => items.map((item) => ({ ...item, read: true })))
              }
              onClearAll={() => setNotifications([])}
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
