import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { listService } from '../services/ListService';

/**
 * Une liste et ses items, rechargée quand la langue change. Pas gardée en
 * mémoire une fois l'écran fermé (`gcTime: 0`) : rouverte, elle montre les items
 * actuels.
 */
export function useListDefinition(name: string) {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['list', name, locale],
    queryFn: () => listService.get(name),
    gcTime: 0,
  });
}
