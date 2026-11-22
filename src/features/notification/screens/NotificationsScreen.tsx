import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { activeFilterCount, setFilterFields, useListFilters } from '@/features/list/utils/filters';
import { BackHeader } from '@/shared/components/BackHeader';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { NetworkError } from '@/shared/api/errors';
import { List } from '@/shared/components/List';
import { SEARCH_DELAY, useDebounced } from '@/shared/hooks/useDebounced';
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
  const { user } = useAuth();
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
    // Qui envoie, sauf nous (la copie de sa propre demande n'a pas d'auteur).
    const sender = item.actor && String(item.actor.id) !== String(user?.id) ? item.actor : null;
    // C'est nous qui avons agi (la copie de notre propre action) et elle porte un message : « Toi », au-dessus de ce
    // message (décision 2026-11-22-carte-notification-toi).
    const mine = !sender && !!item.message && (item.own === true || (item.actor != null && String(item.actor.id) === String(user?.id)));

    return (
    <Pressable
      testID={`notification-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : `${t('notifications.unread')} : `}${item.card_title ?? item.title}. ${sender && item.summary ? item.summary : item.body}${sender ? `, ${sender.name}` : mine ? `, ${t('notifications.you')}` : ''}${item.message ? `. ${item.message}` : ''}`}
      onPress={() => open(item)}
      style={({ pressed }) => [
        styles.item,
        { borderColor: theme.backgroundSelected, backgroundColor: item.read ? theme.background : theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={styles.texts}>
        {/* Le type de l'action en gras (« Nouvelle demande », « Demande acceptée », décision
            2026-11-22-notification-par-action) ; plus de logement ni de statut. Puis le texte ; la ligne de qui envoie
            et de la date ; son message en italique gris, sur une ligne. Toucher ailleurs ouvre le détail (décision
            2026-11-22-carte-notification-type-auteur-message-date). */}
        <ThemedText type="smallBold" testID={`notification-${item.id}-type`}>
          {item.card_title ?? item.title}
        </ThemedText>
        {/* Le texte de la notification, après le type (décision 2026-11-22-carte-notification-texte) :
            sans le nom de qui envoie quand il est affiché dessous ; le nom du logement, et du membre, ouvrent leur page (décision
            2026-11-22-lien-nom-logement). */}
        <NotificationText
          body={sender && item.summary ? item.summary : item.body}
          links={item.text_links ?? []}
          onLink={(link) => open(item, link)}
          testID={`notification-${item.id}-text`}
        />
        {/* Une ligne : le nom de qui envoie à gauche (il ouvre sa page), « Toi » si c'est nous et qu'il y a un message, la date à droite ;
            puis le message (décisions 2026-11-22-carte-notification-lien-expediteur et
            2026-11-22-carte-notification-expediteur-date-message, 2026-11-22-carte-notification-toi). */}
        <View style={styles.meta}>
          {sender && (
            <ThemedText
              type="smallBold"
              accessibilityRole="link"
              onPress={() => open(item, sender.link)}
              style={[styles.sender, { color: theme.primary }]}
              testID={`notification-${item.id}-actor`}>
              {sender.name}
            </ThemedText>
          )}
          {mine && (
            <ThemedText type="smallBold" style={styles.sender} testID={`notification-${item.id}-actor`}>
              {t('notifications.you')}
            </ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.date} testID={`notification-${item.id}-date`}>
            {relativeTime(item.created_at, t, locale)}
          </ThemedText>
        </View>
        {item.message && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.message} testID={`notification-${item.id}-message`}>
            {item.message}
          </ThemedText>
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
            {/* « Demandes » : ouverte depuis une carte de « Mes logements » (décision 2026-11-21-demandes-depuis-logements). */}
            <BackHeader title={t('notifications.requests')} />
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  date: { marginLeft: 'auto', textAlign: 'right' },
  message: { fontStyle: 'italic' },
  sender: { flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
