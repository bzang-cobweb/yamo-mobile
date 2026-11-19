// Route `/filters/[list]` : les filtres d'une liste (décision
// 2026-11-19-contrat-filtres-vitrine), pour un visiteur comme pour un membre.
import { useLocalSearchParams } from 'expo-router';

import { FilterScreen } from '@/features/list/screens/FilterScreen';

export default function FilterRoute() {
  const { list } = useLocalSearchParams<{ list: string }>();

  return <FilterScreen list={String(list)} />;
}
