// Route `/partners/[id]` : la page d'un partenaire (décision 2026-11-23-partenaires-liste-detail).
import { useLocalSearchParams } from 'expo-router';

import { PartnerDetailScreen } from '@/features/partner/screens/PartnerDetailScreen';

export default function PartnerDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PartnerDetailScreen id={String(id)} />;
}
