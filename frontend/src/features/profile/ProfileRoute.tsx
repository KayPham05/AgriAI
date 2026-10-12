'use client';
import { ProfilePage } from '@/views/ProfilePage';
import { useAuth, useHistory } from '@/providers/AppContexts';
export function ProfileRoute() {
  const { profile, session, updateProfile, openAuthentication, logout } = useAuth();
  const { history } = useHistory();
  return (
    <ProfilePage
      profile={profile}
      history={history}
      onUpdateProfile={updateProfile}
      onOpenLogin={() => openAuthentication('login')}
      isAuthenticated={Boolean(session)}
      onLogout={logout}
    />
  );
}
