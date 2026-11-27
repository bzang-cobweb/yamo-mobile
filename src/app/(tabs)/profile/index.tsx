// Route `/profile` (onglet Profil) : l'écran vit dans la feature auth. Un visiteur y voit une invitation à se
// connecter (décision 2026-11-27-onglets-visiteur-invitation).
import { GuestTab } from '@/features/auth/components/GuestTab';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';

export default function ProfileTab() {
  const { user, t } = useAuth();

  if (user === null) {
    return <GuestTab title={t('tabs.profile')} message={t('auth.guest.profile')} testID="guest-profile" />;
  }

  return <ProfileScreen />;
}
