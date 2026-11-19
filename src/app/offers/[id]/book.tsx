// Route `/offers/[id]/book` : réserver ou demander une visite (décision
// 2026-11-19-contrat-reservations), formulaire `offer.booking` décrit par l'API et lié
// à l'offre ; un membre connecté seulement. L'écran est celui des formulaires du
// profil : après l'envoi, retour à la fiche avec le message.
import { useLocalSearchParams } from 'expo-router';

import { ProfileFormScreen } from '@/features/auth/screens/ProfileFormScreen';

export const BOOKING_FORM = 'offer.booking';

export default function OfferBookingRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ProfileFormScreen key={String(id)} form={BOOKING_FORM} record={String(id)} />;
}
