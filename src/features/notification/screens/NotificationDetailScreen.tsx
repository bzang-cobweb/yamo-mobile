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
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { NotificationConversation } from '../components/NotificationConversation';
import { APP_LINK, NotificationText } from '../components/NotificationText';
import { useMarkRead, useNotification } from '../hooks/useNotifications';
import { formatStamp } from '../utils/stamp';

/**
 * La page d'une notification (`/notifications/[id]`), ouverte depuis la liste
 * (décision 2026-11-20-suivi-conversation) :
 * - dans la barre du haut, le type de la notification (« Demande de logement ») ;
 * - en haut, une zone fixe, qui ne défile pas : la pastille du statut, à gauche, puis le
 *   texte de la demande, sans le nom de qui l'a faite (`summary`,
 *   à défaut `body`), et le total de la demande (`booking`, décision 2026-11-20-notification-generique) ;
 * - dessous, ce qui défile : le suivi de la demande comme une conversation, le membre
 *   de l'autre partie à gauche, celles du lecteur à droite (« Toi ») ; sans demande, le message joint et la date ;
 * - dans la barre fixe du bas, un bouton vers l'écran qu'elle désigne (« Traiter la demande »).
 *
 * Ouverte, elle est marquée lue.
 */
export function NotificationDetailScreen({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const theme = useTheme();
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

  // L'heure seule le jour même (décision 2026-11-20-suivi-conversation).
  const date = notification?.created_at ? formatStamp(notification.created_at, locale, 'full') : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          {/* Le type de la notification dans la barre du haut (« Demande de logement ») ; « Notification » en attendant. */}
          <BackHeader title={notification?.title || t('notifications.detail')} />
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
            <>
              {/* La zone fixe : la pastille à gauche, le texte, le total. */}
              <View style={[styles.head, { borderBottomColor: theme.backgroundSelected }]} testID="notification-detail-head">
                <View style={[styles.headContent, { maxWidth: MaxContentWidth / 2 }]}>
                  {/* La pastille du statut avant le texte, à gauche. */}
                  {notification.tag && (
                    <View style={styles.tag} testID="notification-detail-tag-row">
                      <StatusTag tag={notification.tag} testID="notification-detail-tag" />
                    </View>
                  )}
                  <NotificationText
                    type="default"
                    body={notification.summary ?? notification.body}
                    links={notification.text_links ?? []}
                    onLink={go}
                    testID="notification-detail-text"
                  />
                  {/* Les dates, après le texte, une par ligne : l'arrivée et le départ d'un séjour,
                      la date d'une visite (décision 2026-11-20-heures-arrivee-depart). */}
                  {(notification.booking?.dates ?? []).map((line, index) => (
                    <ThemedText key={line} type="small" themeColor="textSecondary" testID={`notification-detail-dates-${index}`}>
                      {line}
                    </ThemedText>
                  ))}
                  {/* Le nombre de personnes, après le texte (un séjour). */}
                  {notification.booking?.guests_label && (
                    <ThemedText type="small" themeColor="textSecondary" testID="notification-detail-guests">
                      {notification.booking.guests_label}
                    </ThemedText>
                  )}
                  {/* Le total de la demande (logement meublé), en gras. */}
                  {notification.booking?.total && (
                    <ThemedText style={styles.total} testID="notification-detail-total">
                      {notification.booking.total}
                    </ThemedText>
                  )}
                </View>
              </View>
              {/* Sans marge ajoutée par iOS en haut du contenu. */}
              <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.body, { maxWidth: MaxContentWidth / 2 }]} testID="notification-detail-scroll">
                {(notification.history ?? []).length > 0 ? (
                  <NotificationConversation steps={notification.history ?? []} onOpen={go} />
                ) : (
                  <>
                    {notification.message && <Quote text={notification.message} testID="notification-detail-message" />}
                    {/* La date, après le message, alignée à droite. */}
                    {date && (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.date} testID="notification-detail-date">
                        {date}
                      </ThemedText>
                    )}
                  </>
                )}
              </ScrollView>
            </>
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
  head: { borderBottomWidth: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  headContent: { width: '100%', alignSelf: 'center', gap: Spacing.two },
  tag: { alignSelf: 'flex-start' },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  date: { textAlign: 'right' },
  total: { fontWeight: '700' },
});
