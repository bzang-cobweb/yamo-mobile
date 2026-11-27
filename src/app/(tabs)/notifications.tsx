// Route `/notifications` (onglet « Notifications », entre Accueil et Profil ; décision
// 2026-11-19-contrat-centre-notifications) : l'écran vit dans la feature notification. Un visiteur y voit une
// invitation à se connecter (décision 2026-11-27-onglets-visiteur-invitation).
import { GuestTab } from '@/features/auth/components/GuestTab';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificationsScreen } from '@/features/notification/screens/NotificationsScreen';

export default function NotificationsTab() {
  const { user, t } = useAuth();

  if (user === null) {
    return <GuestTab title={t('tabs.notifications')} message={t('auth.guest.notifications')} testID="guest-notifications" />;
  }

  return <NotificationsScreen />;
}
