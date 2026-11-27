// Route `/notifications` (onglet « Notifications », entre Accueil et Profil ; décision
// 2026-11-19-contrat-centre-notifications) : l'écran vit dans la feature notification. Un visiteur y voit la connexion
// (décision 2026-11-27-visiteur-onglets).
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { NotificationsScreen } from '@/features/notification/screens/NotificationsScreen';

export default function NotificationsTab() {
  const { user } = useAuth();

  return user === null ? <SignInScreen embedded /> : <NotificationsScreen />;
}
