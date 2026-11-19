// Route `/offers/[id]/calendar` : le calendrier d'une offre, pour son propriétaire,
// ouvert depuis sa carte dans « Mes logements » (décision 2026-11-19-contrat-calendrier-offre).
import { useLocalSearchParams } from 'expo-router';

import { OfferCalendarScreen } from '@/features/offer/screens/OfferCalendarScreen';

export default function OfferCalendarRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OfferCalendarScreen id={String(id)} />;
}
