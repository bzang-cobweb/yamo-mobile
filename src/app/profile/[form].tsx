// Route `/profile/[form]` : tout formulaire du profil, nommé par le menu servi par
// l'API, ou ouvert depuis une liste (`?record=` pour un item) ; l'écran vit dans
// la feature auth. Hors des onglets, dans la pile racine : il glisse par-dessus tout
// l'écran, sans menu du bas, et son bouton d'envoi est fixé à sa place (décision
// 2026-11-19-contrat-bouton-fixe-formulaires). Dans l'onglet, la barre du haut et le
// menu disparaissaient à l'ouverture et la pile, pas encore redimensionnée pendant
// l'animation, cachait le bas de l'écran (le bouton) le temps du glissement.
import { useLocalSearchParams } from 'expo-router';

import { ProfileFormScreen } from '@/features/auth/screens/ProfileFormScreen';

export default function ProfileFormRoute() {
  const { form, record } = useLocalSearchParams<{ form: string; record?: string }>();

  // Un autre formulaire, ou un autre enregistrement, repart de zéro (définition, étape du code).
  return <ProfileFormScreen key={`${form}:${record ?? ''}`} form={form} record={record || undefined} />;
}
