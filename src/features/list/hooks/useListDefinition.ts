import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useI18n } from '@/shared/i18n/I18nContext';

import { listService } from '../services/ListService';
import type { ListDefinition } from '../types';

/**
 * Une liste et ses items, chargés page par page en suivant le curseur servi par
 * l'API (décision 2026-11-18-contrat-liste-infinie-role-admin), rechargée quand
 * la langue change. `data` est la première page (titre, texte vide, création)
 * avec les items de toutes les pages chargées, bout à bout.
 *
 * `reload()` repart de la première page : après un retrait ou un enregistrement,
 * une seule requête, sans repasser par l'état de chargement.
 *
 * Pas gardée en mémoire une fois l'écran fermé (`gcTime: 0`) : rouverte, elle
 * montre les items actuels.
 */
export function useListDefinition(name: string) {
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['list', name, locale], [name, locale]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => listService.get(name, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: ListDefinition) => last.next_cursor ?? undefined,
    select: (data: InfiniteData<ListDefinition, string | null>): ListDefinition => ({
      ...data.pages[0],
      next_cursor: data.pages[data.pages.length - 1].next_cursor,
      items: data.pages.flatMap((page) => page.items),
    }),
    gcTime: 0,
  });

  const { refetch } = query;

  const reload = useCallback(async () => {
    queryClient.setQueryData<InfiniteData<ListDefinition, string | null>>(queryKey, (data) =>
      data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
    );
    await refetch();
  }, [queryClient, queryKey, refetch]);

  return { ...query, reload };
}
