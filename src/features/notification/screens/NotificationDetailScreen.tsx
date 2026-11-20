import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { Quote } from '@/shared/components/Quote';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { NotificationActor } from '../components/NotificationActor';
import { NotificationHistory } from '../components/NotificationHistory';
import { NotificationType } from '../components/NotificationType';
import { APP_LINK, NotificationText } from '../components/NotificationText';
import { useMarkRead, useNotification } from '../hooks/useNotifications';

/**
 * La page d'une notification (`/notifications/[id]`), ouverte depuis la liste :
 * - à la place du titre, qui agit, comme sur la carte (photo cerclée de vert en
 *   ligne, nom), avec son e-mail et son téléphone ;
 * - son type en gras, et dessous le statut réel de la demande ;
 * - son texte, sans le nom de qui agit, avec ses passages liés (l'offre) ;
 * - le message joint, entier, puis la date complète, alignée à droite ;
 * - le suivi de la demande, de la plus ancienne étape à la plus récente, des deux côtés
 *   (décision 2026-11-20-suivi-demande) ;
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
            // Sans marge ajoutée par iOS en haut du contenu (un vide au-dessus de la photo).
            <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
              {/* À la place du titre : qui agit, comme sur la carte (photo cerclée de vert en ligne, nom, date complète) ;
                  puis le type en gras et le statut dessous. */}
              <NotificationActor actor={notification.actor} date={null} contact onOpen={go} testID="notification-detail" />
              <NotificationType type={notification.title} tag={notification.tag} testID="notification-detail" />
              <NotificationText
                type="default"
                body={notification.actor && notification.summary ? notification.summary : notification.body}
                links={notification.text_links ?? []}
                onLink={go}
                testID="notification-detail-text"
              />
              {/* Le total de la demande (logement meublé), en gras. */}
              {notification.total && (
                <ThemedText style={styles.total} testID="notification-detail-total">
                  {notification.total}
                </ThemedText>
              )}
              {/* Même ordre que la carte : le statut, le texte, puis le message, entier ici. */}
              {notification.message && <Quote text={notification.message} testID="notification-detail-message" />}
              {/* La date, après le message, alignée à droite. */}
              {date && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.date} testID="notification-detail-date">
                  {date}
                </ThemedText>
              )}
              {/* Le suivi de la demande : toutes ses étapes, des deux côtés. */}
              <NotificationHistory steps={notification.history ?? []} />
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
  date: { textAlign: 'right' },
  total: { fontWeight: '700' },
});
