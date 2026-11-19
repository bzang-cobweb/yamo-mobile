// Route `/offers/[id]/calendar` : le calendrier d'une offre, pour son propriétaire,
// ouvert depuis sa carte dans « Mes logements », ou depuis « Traiter la demande » d'une
// notification, au mois de la demande (`?month=AAAA-MM`) (décision 2026-11-19-contrat-calendrier-offre).
import { useLocalSearchParams } from 'expo-router';

import { OfferCalendarScreen } from '@/features/offer/screens/OfferCalendarScreen';

export default function OfferCalendarRoute() {
  const { id, month } = useLocalSearchParams<{ id: string; month?: string }>();

  return <OfferCalendarScreen id={String(id)} month={typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : null} />;
}
