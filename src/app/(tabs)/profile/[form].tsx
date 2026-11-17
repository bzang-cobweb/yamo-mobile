// Route `/profile/[form]` : tout formulaire du profil, nommé par le menu servi par
// l'API ; l'écran vit dans la feature auth.
import { useLocalSearchParams } from 'expo-router';

import { ProfileFormScreen } from '@/features/auth/screens/ProfileFormScreen';

export default function ProfileFormRoute() {
  const { form } = useLocalSearchParams<{ form: string }>();

  // Un autre formulaire repart de zéro (définition, étape du code).
  return <ProfileFormScreen key={form} form={form} />;
}
