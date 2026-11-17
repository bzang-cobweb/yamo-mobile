// Route `/profile/[form]` : tout formulaire du profil, nommé par le menu servi par
// l'API, ou ouvert depuis une liste (`?record=` pour un item) ; l'écran vit dans
// la feature auth.
import { useLocalSearchParams } from 'expo-router';

import { ProfileFormScreen } from '@/features/auth/screens/ProfileFormScreen';

export default function ProfileFormRoute() {
  const { form, record } = useLocalSearchParams<{ form: string; record?: string }>();

  // Un autre formulaire, ou un autre enregistrement, repart de zéro (définition, étape du code).
  return <ProfileFormScreen key={`${form}:${record ?? ''}`} form={form} record={record || undefined} />;
}
