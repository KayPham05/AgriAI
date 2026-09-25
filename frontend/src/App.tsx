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
import { HomePage } from './pages/HomePage';
import { DiagnosePage } from './pages/DiagnosePage';
import { PlantsPage } from './pages/PlantsPage';
import { PlantDetailPage } from './pages/PlantDetailPage';
import { DiseasesPage } from './pages/DiseasesPage';
import { DiseaseDetailPage } from './pages/DiseaseDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AboutAiPage } from './pages/AboutAiPage';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Khách dùng thử',
    email: '',
    role: 'Hồ sơ trên thiết bị',
    location: 'Chưa thiết lập',
    joinedDate: 'Bản demo',
    avatarUrl: '',
  });

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Diagnosis History with LocalStorage Persistence
  const [history, setHistory] = useState<DiagnosisResult[]>(() => {
    try {
      const saved = localStorage.getItem('leafai_history');
      if (saved) {
        const records = JSON.parse(saved);
        if (Array.isArray(records)) return records.map((item: DiagnosisResult) => ({ ...item, isDemo: true }));
      }
    } catch (e) {
      console.warn('Could not read history from localStorage', e);
    }
    return [];
  });

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('leafai_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [history]);

  // Toast Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [historyDetailResult, setHistoryDetailResult] = useState<DiagnosisResult | null>(null);

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
  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    addToast({
      type: 'info',
      title: 'Đã xóa bản ghi',
      message: 'Phiếu kiểm định đã được xóa khỏi nhật ký của bạn.',
    });
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
    const found = ALL_DISEASES.find((d) => d.id === diseaseId);
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

  const handleViewHistoryItem = (result: DiagnosisResult) => {
    setHistoryDetailResult(result);
    setIsHistoryDetailOpen(true);
  };

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
        onOpenLogin={() => setIsLoginOpen(true)}
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
          <DiagnosePage />
        )}

        {activeTab === 'plants' && !selectedPlant && (
          <PlantsPage
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
            onOpenLogin={() => setIsLoginOpen(true)}
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
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(profile) => {
          setUserProfile(profile);
          addToast({
            type: 'success',
            title: 'Đã mở hồ sơ mẫu',
            message: 'Đây là hồ sơ dùng thử, chưa có tài khoản đăng nhập.',
          });
        }}
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
