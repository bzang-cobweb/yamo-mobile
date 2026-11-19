// Route `/profile/lists/[list]` : toute liste du profil, nommée par le menu servi
// par l'API ; l'écran vit dans la feature auth. Hors des onglets, comme les
// formulaires : sans menu du bas (décision 2026-11-19-contrat-reservations-logements-profil).
import { useLocalSearchParams } from 'expo-router';

import { ProfileListScreen } from '@/features/auth/screens/ProfileListScreen';

export default function ProfileListRoute() {
  const { list } = useLocalSearchParams<{ list: string }>();

  return <ProfileListScreen key={list} list={list} />;
}
