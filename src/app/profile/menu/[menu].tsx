// Route `/profile/menu/[menu]` : un sous-menu du profil, nommé par le menu servi par l'API (décision
// 2026-11-27-menu-profil-icones-sous-menus) ; l'écran vit dans la feature auth. Hors des onglets, comme les
// formulaires du profil.
import { useLocalSearchParams } from 'expo-router';

import { ProfileSubMenuScreen } from '@/features/auth/screens/ProfileSubMenuScreen';

export default function ProfileSubMenuRoute() {
  const { menu } = useLocalSearchParams<{ menu: string }>();

  return <ProfileSubMenuScreen key={menu} menu={menu} />;
}
