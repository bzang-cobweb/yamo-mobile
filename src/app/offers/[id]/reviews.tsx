// Route `/offers/[id]/reviews` : tous les avis d'une offre, ouverts depuis la fiche
// (décision 2026-11-19-nuit-tous-les-avis). L'écran vit dans la feature offer.
import { useLocalSearchParams } from 'expo-router';

import { OfferReviewsScreen } from '@/features/offer/screens/OfferReviewsScreen';

export default function OfferReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OfferReviewsScreen id={String(id)} />;
}
