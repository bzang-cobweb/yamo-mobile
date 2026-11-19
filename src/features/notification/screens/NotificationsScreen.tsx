import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { NetworkError } from '@/shared/api/errors';
import { Quote } from '@/shared/components/Quote';
import { Avatar } from '@/features/auth/components/Avatar';
import { StatusTag, TONE_COLORS } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useNotifications } from '../hooks/useNotifications';
import type { AppNotification } from '../types';
import { relativeTime } from '../utils/relativeTime';
import { APP_LINK, NotificationText } from '../components/NotificationText';

/**
 * L'onglet « Notifications » (décision 2026-11-19-contrat-centre-notifications) : la
 * plus récente en tête, par pages ; les non lues mises en avant. Toucher une
 * notification la marque lue et ouvre sa page (`/notifications/[id]`) ; les
 * passages liés de son texte (le nom d'un membre, de l'offre) ouvrent le leur ; « Tout marquer
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

  /** Marque la notification lue et ouvre un écran : sa page, ou un passage lié de son texte. */
  function open(notification: AppNotification, link: string = `/notifications/${notification.id}`) {
    if (!notification.read) {
      void markRead(notification.id);
    }
    if (APP_LINK.test(link)) {
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
            <View style={styles.texts}>
              {/* 1. Qui agit (sa photo, cerclée de vert s'il est en ligne ; elle et son nom ouvrent sa page) et, sous son nom, la date. */}
              <View style={styles.head}>
                {item.actor && (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={item.actor.name}
                    hitSlop={Spacing.one}
                    onPress={() => item.actor && open(item, item.actor.link)}
                    style={({ pressed }) => [styles.ring, { borderColor: item.actor?.online ? TONE_COLORS.success : 'transparent' }, pressed && styles.pressed]}
                    testID={`notification-${item.id}-avatar${item.actor.online ? '-online' : ''}`}>
                    <Avatar user={{ initials: item.actor.initials, avatar_url: item.actor.photo }} size={AVATAR_SIZE} />
                  </Pressable>
                )}
                <View style={styles.headTexts}>
                  {item.actor ? (
                    <ThemedText
                      type="smallBold"
                      accessibilityRole="link"
                      testID={`notification-${item.id}-actor`}
                      onPress={() => item.actor && open(item, item.actor.link)}>
                      {item.actor.name}
                    </ThemedText>
                  ) : (
                    <ThemedText type="smallBold">{item.title}</ThemedText>
                  )}
                  <ThemedText type="small" themeColor="textSecondary">
                    {relativeTime(item.created_at, t, locale)}
                  </ThemedText>
                </View>
              </View>
              {/* 2. Le texte, sans le nom de qui agit. */}
              <NotificationText
                body={item.actor && item.summary ? item.summary : item.body}
                links={item.text_links ?? []}
                onLink={(link) => open(item, link)}
                testID={`notification-${item.id}-text`}
              />
              {/* 3. Le message envoyé, sur une ligne (« … » au-delà ; entier sur la page de la notification). */}
              {item.message && <Quote text={item.message} numberOfLines={1} testID={`notification-${item.id}-message`} />}
              {/* 4. Le statut. */}
              {item.tag && <StatusTag tag={item.tag} testID={`notification-${item.id}-tag`} />}
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
            </View>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

/** Diamètre de la photo de qui agit. */
const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.two, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  empty: { textAlign: 'center', paddingVertical: Spacing.five },
  more: { paddingVertical: Spacing.three },
  item: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: 8 },
  texts: { flex: 1, gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headTexts: { flex: 1, gap: 2 },
  ring: { borderWidth: 2, borderRadius: (AVATAR_SIZE + 8) / 2, padding: 2 },
  link: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
