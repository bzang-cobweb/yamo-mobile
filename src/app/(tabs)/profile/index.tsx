// Route `/profile` (onglet Profil) : l'écran vit dans la feature auth. Un visiteur y voit la connexion (décision
// 2026-11-27-visiteur-onglets).
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ProfileScreen } from '@/features/auth/screens/ProfileScreen';
import { SignInScreen } from '@/features/auth/screens/SignInScreen';

export default function ProfileTab() {
  const { user } = useAuth();

  return user === null ? <SignInScreen embedded /> : <ProfileScreen />;
}
