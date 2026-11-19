import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { NetworkError } from '@/shared/api/errors';
import { StatusTag } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useNotifications } from '../hooks/useNotifications';
import type { AppNotification } from '../types';
import { relativeTime } from '../utils/relativeTime';

/** Un écran de l'app (`/profile/lists/offer.bookings`) : jamais une adresse externe. */
const APP_LINK = /^\/[A-Za-z0-9._\-/]+$/;

/**
 * L'onglet « Notifications » (décision 2026-11-19-contrat-centre-notifications) : la
 * plus récente en tête, par pages ; les non lues mises en avant. Toucher une
 * notification la marque lue et ouvre l'écran qu'elle désigne ; ses liens
 * (« Voir l'annonce ») ouvrent le leur ; « Tout marquer
 * comme lu » en tête. Rechargée à chaque retour sur l'onglet.
 */
export function NotificationsScreen() {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const query = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const { refetch, refreshCount, markRead, markAllRead } = query;

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refreshCount();
    }, [refetch, refreshCount]),
  );

  /** Marque la notification lue et ouvre l'écran désigné (la sienne, ou l'un de ses liens). */
  function open(notification: AppNotification, link: string | null = notification.link) {
    if (!notification.read) {
      void markRead(notification.id);
    }
    if (link !== null && APP_LINK.test(link)) {
      router.push(link as Href);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await Promise.all([refetch(), refreshCount()]);
    setRefreshing(false);
  }

  if (query.isPending || query.isError) {
    return (
      <ThemedView style={styles.center}>
        {query.isPending ? (
          <ActivityIndicator testID="notifications-loading" />
        ) : (
          <>
            <ThemedText themeColor="textSecondary" accessibilityRole="alert">
              {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
            </ThemedText>
            <Pressable accessibilityRole="button" testID="notifications-retry" onPress={() => refetch()}>
              <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
            </Pressable>
          </>
        )}
      </ThemedView>
    );
  }

  const items = query.data;
  const hasUnread = items.some((item) => !item.read);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        testID="notifications-list"
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="subtitle">{t('notifications.title')}</ThemedText>
            {hasUnread && (
              <Pressable accessibilityRole="button" testID="notifications-read-all" hitSlop={Spacing.two} onPress={() => void markAllRead()}>
                <ThemedText type="linkPrimary">{t('notifications.markAllRead')}</ThemedText>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty} testID="notifications-empty">
            {t('notifications.empty')}
          </ThemedText>
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} /> : undefined}
        renderItem={({ item }) => (
          <Pressable
            testID={`notification-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : `${t('notifications.unread')} : `}${item.title}${item.tag ? `, ${item.tag.label}` : ''}. ${item.body}${item.message ? ` « ${item.message} »` : ''}`}
            onPress={() => open(item)}
            style={({ pressed }) => [
              styles.item,
              { borderColor: theme.backgroundSelected, backgroundColor: item.read ? theme.background : theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            {!item.read && <View style={[styles.dot, { backgroundColor: theme.primary }]} testID={`notification-${item.id}-unread`} />}
            <View style={styles.texts}>
              <ThemedText type={item.read ? 'default' : 'smallBold'}>{item.title}</ThemedText>
              {item.tag && <StatusTag tag={item.tag} testID={`notification-${item.id}-tag`} />}
              <ThemedText type="small" themeColor="textSecondary">
                {item.body}
              </ThemedText>
              {item.message && (
                <View style={[styles.message, { borderColor: theme.backgroundSelected }]} testID={`notification-${item.id}-message`}>
                  <ThemedText type="small" style={styles.messageText}>
                    « {item.message} »
                  </ThemedText>
                </View>
              )}
              {item.links.map((link, index) => (
                <Pressable
                  key={link.link}
                  accessibilityRole="link"
                  testID={`notification-${item.id}-link-${index}`}
                  hitSlop={Spacing.one}
                  onPress={() => open(item, link.link)}
                  style={styles.link}>
                  <ThemedText type="linkPrimary">{link.label}</ThemedText>
                </Pressable>
              ))}
              <ThemedText type="small" themeColor="textSecondary">
                {relativeTime(item.created_at, t, locale)}
              </ThemedText>
            </View>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.two, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
  more: { paddingVertical: Spacing.three },
  item: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: Spacing.two },
  texts: { flex: 1, gap: Spacing.one },
  message: { borderLeftWidth: 3, paddingLeft: Spacing.two },
  messageText: { fontStyle: 'italic' },
  link: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
