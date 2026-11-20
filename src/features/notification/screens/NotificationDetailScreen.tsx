import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { Quote } from '@/shared/components/Quote';
import { StatusTag } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { NotificationActor } from '../components/NotificationActor';
import { APP_LINK, NotificationText } from '../components/NotificationText';
import { useMarkRead, useNotification } from '../hooks/useNotifications';

/**
 * La page d'une notification (`/notifications/[id]`), ouverte depuis la liste :
 * - à la place du titre, qui agit, comme sur la carte (photo cerclée de vert en
 *   ligne, nom, date complète) ; sans qui agit, le titre ;
 * - son statut ;
 * - son texte, sans le nom de qui agit, avec ses passages liés (l'offre) ;
 * - le message joint, entier ;
 * - dans la barre fixe du bas, un bouton vers l'écran qu'elle désigne (« Traiter la demande »).
 *
 * Ouverte, elle est marquée lue.
 */
export function NotificationDetailScreen({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const query = useNotification(id);
  const markRead = useMarkRead();
  const notification = query.data;

  useEffect(() => {
    if (notification && !notification.read) {
      void markRead(notification.id);
    }
  }, [notification, markRead]);

  function go(link: string) {
    if (APP_LINK.test(link)) {
      router.push(link as Href);
    }
  }

  const date = notification?.created_at
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(notification.created_at))
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={t('notifications.detail')} />
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="notification-detail-loading" />
            </View>
          ) : query.isError || !notification ? (
            <View style={styles.center}>
              <ThemedText style={styles.error} accessibilityRole="alert" testID="notification-detail-error">
                {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
              </ThemedText>
              <Pressable accessibilityRole="button" testID="notification-detail-retry" onPress={() => query.refetch()}>
                <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
              {/* À la place du titre : qui agit, comme sur la carte (photo cerclée de vert en ligne, nom, date complète) ;
                  sans qui agit (ancienne notification), le titre. */}
              <NotificationActor actor={notification.actor} title={notification.title} date={date ?? ''} onOpen={go} testID="notification-detail" />
              {notification.tag && <StatusTag tag={notification.tag} testID="notification-detail-tag" />}
              <NotificationText
                type="default"
                body={notification.actor && notification.summary ? notification.summary : notification.body}
                links={notification.text_links ?? []}
                onLink={go}
                testID="notification-detail-text"
              />
              {/* Même ordre que la carte : le statut, le texte, puis le message, entier ici. */}
              {notification.message && <Quote text={notification.message} testID="notification-detail-message" />}
            </ScrollView>
          )}
          {/* Le bouton dans la barre fixe du bas : « Traiter la demande » (le propriétaire), « Mes réservations » (le membre). */}
          {notification?.link && APP_LINK.test(notification.link) && (
            <FixedButtonBar
              label={notification.link_label ?? t('notifications.open')}
              onPress={() => notification.link && go(notification.link)}
              testID="notification-detail-open"
            />
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  error: { color: ERROR_COLOR },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
});
