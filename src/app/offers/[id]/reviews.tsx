// Route `/offers/[id]/reviews` : tous les avis d'une offre, ouverts depuis la fiche, en liste comme « Mes logements »,
// avec la recherche (décision 2026-11-25-liste-avis-generique) ; la flèche seule, sans croix.
import { useLocalSearchParams } from 'expo-router';

import { OfferReviewsList } from '@/features/offer/components/OfferReviewsList';

export default function OfferReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OfferReviewsList offer={String(id)} />;
}
