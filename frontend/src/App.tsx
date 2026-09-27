'use client';

import React, { useState, useEffect } from 'react';
import { 
  NavigationTab, 
  DiagnosisResult, 
  UserProfile, 
  NotificationItem, 
  Toast, 
  Plant, 
  Disease 
} from './types';
import { ALL_DISEASES, SUPPORTED_PLANTS } from './data/plantData';

// Navigation & Layout Components
import { Navbar } from './components/layout/Navbar';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginModal } from './components/modals/LoginModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { HistoryDetailModal } from './components/modals/HistoryDetailModal';

// Views
import { HomePage } from './views/HomePage';
import { DiagnosePage } from './views/DiagnosePage';
import { PlantsPage } from './views/PlantsPage';
import { PlantDetailPage } from './views/PlantDetailPage';
import { DiseasesPage } from './views/DiseasesPage';
import { DiseaseDetailPage } from './views/DiseaseDetailPage';
import { HistoryPage } from './views/HistoryPage';
import { ProfilePage } from './views/ProfilePage';
import { AboutAiPage } from './views/AboutAiPage';
import { IntroPage } from './views/IntroPage';
import { LoginSuccessScreen } from './components/common/LoginSuccessScreen';
import { AppSplashScreen } from './components/common/AppSplashScreen';
import { AuthSession, clearAuthSession, restoreAuthSession } from './services/authApi';
import { getDiseases, getPlants } from './services/catalogApi';
import { deletePrediction, getPredictionById, getPredictionHistory } from './services/predictionApi';

const guestProfile: UserProfile = {
  name: 'Khách dùng thử',
  email: '',
  role: 'Hồ sơ trên thiết bị',
  location: 'Chưa thiết lập',
  joinedDate: 'Bản demo',
  avatarUrl: '',
};

function createUserProfile(session: AuthSession): UserProfile {
  const joinedDate = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(session.user.createdAt));

  return {
    name: session.user.fullName,
    email: session.user.email,
    role: session.user.role === 'Admin' ? 'Quản trị viên' : 'Thành viên LeafAI',
    location: 'Chưa thiết lập',
    joinedDate,
    avatarUrl: '',
  };
}

function readGuestHistory(): DiagnosisResult[] {
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

export default function App() {
  const [hasEnteredApp, setHasEnteredApp] = useState(false);
  // true while restoreAuthSession() is in-flight — prevents IntroPage flash on reload
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  // Session waiting for the success-screen interaction before entering the app
  const [loginPendingSession, setLoginPendingSession] = useState<AuthSession | null>(null);
  const [authEntryMode, setAuthEntryMode] = useState<'login' | 'register'>('login');

  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
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
    Promise.allSettled([getPlants(), getDiseases()]).then(([plantResult, diseaseResult]) => {
      if (!isActive) return;
      if (plantResult.status === 'fulfilled') setPlants(plantResult.value);
      if (diseaseResult.status === 'fulfilled') setDiseases(diseaseResult.value);
    });
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;
    restoreAuthSession().then((session) => {
      if (!isActive) return;
      if (session) {
        setAuthSession(session);
        setUserProfile(createUserProfile(session));
        setHasEnteredApp(true);
      }
      // Always mark restore as done so the correct UI is shown
      setIsRestoringSession(false);
    });
    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!authSession) return;
    let isActive = true;
    getPredictionHistory(authSession.token)
      .then((records) => { if (isActive) setHistory(records); })
      .catch((error) => console.warn('Could not load prediction history', error));
    return () => { isActive = false; };
  }, [authSession]);

  // Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [historyDetailResult, setHistoryDetailResult] = useState<DiagnosisResult | null>(null);

  const openAuthentication = (mode: 'login' | 'register') => {
    setAuthEntryMode(mode);
    setIsLoginOpen(true);
  };

  // Toast dispatch helper
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Notification actions
  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // History Actions
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      if (authSession) await deletePrediction(id, authSession.token);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      addToast({
        type: 'info',
        title: 'Đã xóa bản ghi',
        message: authSession ? 'Kết quả đã được xóa khỏi tài khoản.' : 'Kết quả đã được xóa khỏi trình duyệt.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Không thể xóa kết quả',
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      });
    }
  };

  // Quick navigation helpers
  const handleNavigateTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    setSelectedPlant(null);
    setSelectedDisease(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlant = (plant: Plant) => {
    setSelectedPlant(plant);
    setActiveTab('plants');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDisease = (disease: Disease) => {
    setSelectedDisease(disease);
    setActiveTab('diseases');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDiseaseById = (diseaseId: string) => {
    const found = diseases.find((d) => d.id === diseaseId);
    if (found) {
      setSelectedDisease(found);
      setActiveTab('diseases');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDiagnosePlant = (_plant: Plant) => {
    setActiveTab('diagnose');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewHistoryItem = async (result: DiagnosisResult) => {
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
  };

  const handleAuthSuccess = (session: AuthSession) => {
    // Show the success screen first; the user taps the logo to enter the app
    setLoginPendingSession(session);
    setIsLoginOpen(false);
  };

  const handleEnterApp = () => {
    if (!loginPendingSession) return;
    setAuthSession(loginPendingSession);
    setUserProfile(createUserProfile(loginPendingSession));
    setLoginPendingSession(null);
    setHasEnteredApp(true);
    addToast({
      type: 'success',
      title: 'Đăng nhập thành công',
      message: `Chào mừng ${loginPendingSession.user.fullName} quay lại LeafAI.`,
    });
  };

  // While restoring session from storage, show branded splash screen
  if (isRestoringSession) {
    return <AppSplashScreen />;
  }

  // Show success screen after auth — before entering the main app
  if (loginPendingSession) {
    return (
      <LoginSuccessScreen
        userName={loginPendingSession.user.fullName}
        onEnterApp={handleEnterApp}
      />
    );
  }

  if (!hasEnteredApp) {
    return (
      <>
        <IntroPage
          onLogin={() => openAuthentication('login')}
          onRegister={() => openAuthentication('register')}
        />
        <LoginModal
          isOpen={isLoginOpen}
          initialMode={authEntryMode}
          onClose={() => setIsLoginOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans pb-20 md:pb-0 relative overflow-x-hidden" style={{ background: 'var(--armor-bg)', color: 'var(--text-primary)' }}>
      <div className="relative z-10 flex flex-col min-h-screen">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Main Top Navigation */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={handleNavigateTab}
        unreadNotificationsCount={notifications.filter((n) => !n.read).length}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        userProfile={userProfile}
        isAuthenticated={Boolean(authSession)}
        onOpenLogin={() => openAuthentication('login')}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomePage
            onNavigate={handleNavigateTab}
            onSelectPlant={handleSelectPlant}
          />
        )}

        {activeTab === 'diagnose' && (
          <DiagnosePage
            authToken={authSession?.token}
            onPredictionCreated={(result) => setHistory((current) => [result, ...current.filter((item) => item.id !== result.id)])}
          />
        )}

        {activeTab === 'plants' && !selectedPlant && (
          <PlantsPage
            plants={plants}
            onSelectPlant={handleSelectPlant}
            onDiagnosePlant={handleDiagnosePlant}
          />
        )}

        {activeTab === 'plants' && selectedPlant && (
          <PlantDetailPage
            plant={selectedPlant}
            onBack={() => setSelectedPlant(null)}
            onSelectDisease={handleSelectDiseaseById}
            onDiagnosePlant={handleDiagnosePlant}
          />
        )}

        {activeTab === 'diseases' && !selectedDisease && (
          <DiseasesPage
            diseases={diseases}
            onSelectDisease={handleSelectDisease}
            onDiagnoseDiseasePlant={(plantName) => {
              const plant = SUPPORTED_PLANTS.find((p) => p.name.toLowerCase().includes(plantName.toLowerCase()));
              if (plant) {
                handleDiagnosePlant(plant);
              } else {
                handleNavigateTab('diagnose');
              }
            }}
          />
        )}

        {activeTab === 'diseases' && selectedDisease && (
          <DiseaseDetailPage
            disease={selectedDisease}
            onBack={() => setSelectedDisease(null)}
            onDiagnosePlant={(plantName) => {
              const plant = SUPPORTED_PLANTS.find((p) => p.name.toLowerCase().includes(plantName.toLowerCase()));
              if (plant) {
                handleDiagnosePlant(plant);
              } else {
                handleNavigateTab('diagnose');
              }
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            history={history}
            onSelectResult={handleViewHistoryItem}
            onDeleteResult={handleDeleteHistoryItem}
            onNavigateDiagnose={() => handleNavigateTab('diagnose')}
          />
        )}

        {activeTab === 'about' && (
          <AboutAiPage onNavigateDiagnose={() => handleNavigateTab('diagnose')} />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            profile={userProfile}
            history={history}
            onUpdateProfile={(updated) => {
              setUserProfile(updated);
              addToast({
                type: 'success',
                title: 'Đã cập nhật hồ sơ mẫu',
                message: 'Thông tin được cập nhật trong phiên dùng thử này.',
              });
            }}
            onOpenLogin={() => openAuthentication('login')}
            isAuthenticated={Boolean(authSession)}
            onLogout={() => {
              clearAuthSession();
              setAuthSession(null);
              setUserProfile(guestProfile);
              setHistory(readGuestHistory());
              setActiveTab('home');
              setHasEnteredApp(false);
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Floating Navigation Bar */}
      <MobileNavigation
        currentTab={activeTab}
        onSelectTab={handleNavigateTab}
      />

      {/* Modals */}
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
        onMarkAllRead={markAllNotificationsRead}
        onClearAll={clearAllNotifications}
      />

      <HistoryDetailModal
        isOpen={isHistoryDetailOpen}
        onClose={() => setIsHistoryDetailOpen(false)}
        result={historyDetailResult}
        onAnalyzeNew={() => {
          setIsHistoryDetailOpen(false);
          handleNavigateTab('diagnose');
        }}
      />
      </div>
    </div>
  );
}
