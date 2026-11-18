// Route `/offers/[id]` : la fiche d'une offre, pour un visiteur comme pour un
// membre (décision 2026-11-18-fiche-offre). L'écran vit dans la feature offer.
import { useLocalSearchParams } from 'expo-router';

import { OfferDetailScreen } from '@/features/offer/screens/OfferDetailScreen';

export default function OfferDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OfferDetailScreen id={String(id)} />;
}
