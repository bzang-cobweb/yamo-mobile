import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useI18n } from '@/shared/i18n/I18nContext';

import { notificationService } from '../services/NotificationService';
import type { AppNotification, NotificationPage } from '../types';

const UNREAD_KEY = ['notifications', 'unread'];
const LIST_KEY = ['notifications', 'list'];
const DETAIL_KEY = ['notifications', 'detail'];

/** Le nombre de non lues du compte connecté (la pastille de l'onglet). */
export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({ queryKey: [...UNREAD_KEY, user?.id], queryFn: () => notificationService.unreadCount(), enabled: user !== null });
}

/** Marquer une notification lue : tout de suite à l'écran (liste et page), puis par l'API, puis la pastille. */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return useCallback(
    async (id: string) => {
      queryClient.setQueriesData<InfiniteData<NotificationPage, string | null>>({ queryKey: LIST_KEY }, (data) =>
        data ? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => (item.id === id ? { ...item, read: true } : item)) })) } : data,
      );
      queryClient.setQueriesData<AppNotification>({ queryKey: DETAIL_KEY }, (item) => (item && item.id === id ? { ...item, read: true } : item));
      await notificationService.read(id);
      await queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    },
    [queryClient],
  );
}

/** Une notification, pour sa page. */
export function useNotification(id: string) {
  const { locale } = useI18n();

  return useQuery({ queryKey: [...DETAIL_KEY, id, locale], queryFn: () => notificationService.get(id) });
}

/**
 * La liste par pages (la plus récente en tête), rechargée quand la langue change ;
 * marquer lue une notification, ou toutes, met à jour la liste et la pastille.
 */
export function useNotifications() {
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const queryKey = [...LIST_KEY, locale];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => notificationService.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: NotificationPage) => last.next_cursor ?? undefined,
    select: (data: InfiniteData<NotificationPage, string | null>): AppNotification[] => data.pages.flatMap((page) => page.items),
  });

  const refreshCount = useCallback(() => queryClient.invalidateQueries({ queryKey: UNREAD_KEY }), [queryClient]);
  const markRead = useMarkRead();

  const markAllRead = useCallback(async () => {
    queryClient.setQueriesData<InfiniteData<NotificationPage, string | null>>({ queryKey: LIST_KEY }, (data) =>
      data ? { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map((item) => ({ ...item, read: true })) })) } : data,
    );
    await notificationService.readAll();
    await refreshCount();
  }, [queryClient, refreshCount]);

  return { ...query, markRead, markAllRead, refreshCount };
}
