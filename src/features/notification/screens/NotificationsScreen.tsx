import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { activeFilterCount, setFilterFields, useListFilters } from '@/features/list/utils/filters';
import { BackHeader } from '@/shared/components/BackHeader';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { NetworkError } from '@/shared/api/errors';
import { List } from '@/shared/components/List';
import { Quote } from '@/shared/components/Quote';
import { SEARCH_DELAY, useDebounced } from '@/shared/hooks/useDebounced';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useNotifications } from '../hooks/useNotifications';
import type { AppNotification } from '../types';
import { relativeTime } from '../utils/relativeTime';
import { NotificationType } from '../components/NotificationType';
import { APP_LINK, NotificationText } from '../components/NotificationText';

/**
 * L'onglet « Notifications » (décision 2026-11-19-contrat-centre-notifications) : la
 * plus récente en tête, par pages ; les non lues mises en avant. Une recherche (nom
 * de qui agit, titre du logement) et des filtres (logement, statut du logement)
 * la restreignent (décision 2026-11-20-filtres-notifications). Toucher une
 * notification la marque lue et ouvre sa page (`/notifications/[id]`) ; les
 * passages liés de son texte (le nom d'un membre, de l'offre) ouvrent le leur . Rechargée à chaque retour sur l'onglet.
 */
/** Le nom de la liste dans le magasin des filtres (`/filters/notifications`). */
export const NOTIFICATIONS_FILTERS = 'notifications';

/**
 * `back` : ouvert depuis une carte de « Mes logements » (un compteur, « Notifications »), déjà filtré,
 * par-dessus les onglets, avec un en-tête et son bouton retour (décision 2026-11-21-notifications-avec-retour).
 */
export function NotificationsScreen({ back = false }: { back?: boolean } = {}) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');
  const search = useDebounced(searchText.trim(), SEARCH_DELAY);
  const filters = useListFilters(NOTIFICATIONS_FILTERS);
  const query = useNotifications(search, filters.values);
  const [refreshing, setRefreshing] = useState(false);
  const { refetch, refreshCount, markRead } = query;
  const filterFields = query.data?.filters;

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refreshCount();
    }, [refetch, refreshCount]),
  );

  // Les filtres servis par l'API, pour l'écran des filtres (décision 2026-11-20-filtres-notifications).
  useEffect(() => {
    if (filterFields) {
      setFilterFields(NOTIFICATIONS_FILTERS, filterFields);
    }
  }, [filterFields]);

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

  if (query.isPending || (query.isError && !query.data)) {
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

  const items = query.data?.items ?? [];
  const filterCount = activeFilterCount(filters.fields, filters.values);
  const narrowed = search !== '' || filterCount > 0;

  function renderCard(item: AppNotification) {
    return (
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
        {/* 1. Le type en gras, et dessous le statut réel de la demande (sans photo, décision 2026-11-20-carte-sans-photo). */}
        <NotificationType type={item.card_title ?? item.title} tag={item.tag} testID={`notification-${item.id}`} />
        {/* 2. Le texte, sans le nom de qui agit. */}
        <NotificationText
          body={item.actor && item.summary ? item.summary : item.body}
          links={item.text_links ?? []}
          onLink={(link) => open(item, link)}
          testID={`notification-${item.id}-text`}
        />
        {/* 3. Le nom de qui agit (sans lien), puis son message, sur une ligne (« … » au-delà ; entier sur la page). */}
        {item.actor && (
          <ThemedText type="smallBold" testID={`notification-${item.id}-actor`}>
            {item.actor.name}
          </ThemedText>
        )}
        {item.message && <Quote text={item.message} numberOfLines={1} testID={`notification-${item.id}-message`} />}
        {/* 4. La date, après le message, alignée à droite. */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.date} testID={`notification-${item.id}-date`}>
          {relativeTime(item.created_at, t, locale)}
        </ThemedText>
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
    );
  }

  const list = (
      <View style={[styles.content, styles.list]}>
        <List
          testID="notifications-list"
          items={items}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          hasMore={query.hasNextPage}
          onLoadMore={() => query.fetchNextPage()}
          loadingMore={query.isFetchingNextPage}
          loadingMoreLabel={t('list.loading')}
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          empty={narrowed ? t('notifications.noResults') : t('notifications.empty')}
          search={{ value: searchText, onChange: setSearchText, placeholder: t('notifications.search') }}
          filter={
            filters.fields.length > 0 || (filterFields?.length ?? 0) > 0
              ? { label: t('list.filters'), count: filterCount, onPress: () => router.push({ pathname: '/filters/[list]', params: { list: NOTIFICATIONS_FILTERS } }) }
              : null
          }
          contentContainerStyle={styles.items}
        />
      </View>
  );

  if (back) {
    // Par-dessus les onglets : l'en-tête et son bouton retour, vers la carte d'où l'on vient.
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <BackStackProvider>
            <BackHeader title={t('notifications.title')} />
            <View style={styles.top} />
            {list}
          </BackStackProvider>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, styles.top]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{t('notifications.title')}</ThemedText>
        </View>
      </View>
      {list}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', paddingHorizontal: Spacing.four },
  top: { paddingTop: Spacing.four },
  list: { flex: 1 },
  items: { gap: Spacing.two, paddingBottom: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  item: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: 8 },
  texts: { flex: 1, gap: Spacing.two },
  link: { alignSelf: 'flex-start' },
  date: { textAlign: 'right' },
  pressed: { opacity: 0.7 },
});
