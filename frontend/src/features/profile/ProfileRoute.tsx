'use client';
import { ProfilePage } from '@/views/ProfilePage';
import { UserProfilePage } from '@/views/UserProfilePage';
import { useAuth, useHistory, useFeedback } from '@/providers/AppContexts';
export function ProfileRoute() {
  const { profile, session, updateProfile, updateAccount, openAuthentication, logout } = useAuth();
  const { history } = useHistory();
  const { openNotifications } = useFeedback();
  if (session)
    return (
      <UserProfilePage
        key={session.token}
        token={session.token}
        avatarUrl={profile.avatarUrl}
        onAvatarChange={(avatarUrl) => updateProfile({ ...profile, avatarUrl })}
        onAccountUpdated={updateAccount}
        onLogout={logout}
        onNotifications={openNotifications}
      />
    );
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
