// Route `/offers/[id]/review` : son avis sur une offre (décision
// 2026-11-19-contrat-avis-offres), formulaire `offer.review` décrit par l'API et
// lié à l'offre ; un membre connecté seulement. L'écran est celui des formulaires
// du profil : après l'envoi, retour à la fiche avec le message.
import { useLocalSearchParams } from 'expo-router';

import { ProfileFormScreen } from '@/features/auth/screens/ProfileFormScreen';
import { REVIEW_FORM } from '@/features/offer/components/OfferReviews';

export default function OfferReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ProfileFormScreen key={String(id)} form={REVIEW_FORM} record={String(id)} />;
}
