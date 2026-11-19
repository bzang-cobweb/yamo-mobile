// Route `/members/[id]` : la page publique d'un membre, ouverte depuis son nom dans
// une notification (décision 2026-11-19-page-membre).
import { useLocalSearchParams } from 'expo-router';

import { MemberScreen } from '@/features/offer/screens/MemberScreen';

export default function MemberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <MemberScreen id={String(id)} />;
}
