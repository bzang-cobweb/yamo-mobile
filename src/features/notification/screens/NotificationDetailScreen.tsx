import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import type { BookingLine } from '../types';
import { formatStamp } from '../utils/stamp';

/** Les lignes d'une demande toujours visibles, avant « Voir plus » (décision 2026-11-21-voir-plus-apres-deux-lignes). */
const VISIBLE_LINES = 2;

/**
 * La page d'une notification (`/notifications/[id]`), ouverte depuis la liste
 * (décision 2026-11-20-suivi-conversation) :
 * - dans la barre du haut, le type de la notification (« Demande de logement ») ;
 * - en haut, une zone fixe, qui ne défile pas : le type de location à gauche et la
 *   pastille du statut à droite, puis le nom de l'offre ; sans demande, son texte, sans le nom de qui l'a faite (`summary`,
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
  // Les lignes de la demande, fermées d'abord ; le nom de l'offre les déplie ou les plie.
  const [open, setOpen] = useState(false);
  const query = useNotification(id);
  const markRead = useMarkRead();
  const { refetch } = query;
  // Au retour sur la page (« Modifier » enregistré, décision 2026-11-21-detail-reservation-modifier),
  // la demande est relue : ses dates, son total. Pas à la première ouverture, déjà chargée.
  const shown = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (shown.current) {
        void refetch();
      }
      shown.current = true;
    }, [refetch]),
  );
  const notification = query.data;

  useEffect(() => {
    if (notification && !notification.read) {
      void markRead(notification.id);
    }
  }, [notification, markRead]);

  // Les deux premières lignes, puis la suite derrière « Voir plus ».
  const lines = notification?.booking?.lines ?? [];
  const split = VISIBLE_LINES;
  const firstLines = lines.slice(0, split);
  const moreLines = lines.slice(split);

  function renderLine(line: BookingLine) {
    return (
      <View key={line.key} style={styles.headRow} testID={`notification-detail-line-${line.key}`}>
        <ThemedText
          type={line.key === 'total' ? 'smallBold' : 'small'}
          themeColor={line.key === 'total' ? undefined : 'textSecondary'}
          testID={`notification-detail-line-${line.key}-label`}>
          {line.label}
        </ThemedText>
        {/* Une valeur avec un lien : le nom de l'hôte ou du membre, vers sa page
            (décision 2026-11-21-detail-reservation-contact). */}
        {line.link && APP_LINK.test(line.link) ? (
          <ThemedText
            type="linkPrimary"
            accessibilityRole="link"
            onPress={() => line.link && go(line.link)}
            style={styles.dateValue}
            testID={`notification-detail-line-${line.key}-value`}>
            {line.value}
          </ThemedText>
        ) : (
          <ThemedText
            type="small"
            themeColor={line.key === 'total' ? undefined : 'textSecondary'}
            style={[styles.dateValue, line.key === 'total' && styles.total]}
            selectable
            testID={`notification-detail-line-${line.key}-value`}>
            {line.value}
          </ThemedText>
        )}
      </View>
    );
  }

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
          {/* Le titre servi dans la barre du haut (« Ma réservation », « Demande reçue ») ; « Notification » en attendant. */}
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
                  {/* La pastille du statut seule, à gauche : le type de location et de logement est dans la barre du haut
                      (décision 2026-11-22-detail-sans-ligne-type). */}
                  {notification.tag && (
                    <View style={styles.tagRow} testID="notification-detail-tag-row">
                      <StatusTag tag={notification.tag} testID="notification-detail-tag" />
                    </View>
                  )}
                  {/* Le nom de l'offre, sous le type de location et la pastille : le toucher ouvre la fiche du
                      logement (décision 2026-11-21-detail-reservation-voir-plus). */}
                  {notification.booking?.offer.title && (
                    <ThemedText
                      accessibilityRole="link"
                      onPress={() => notification.booking && go(`/offers/${notification.booking.offer_id}`)}
                      style={styles.offerLink}
                      testID="notification-detail-offer-title">
                      {notification.booking.offer.title}
                    </ThemedText>
                  )}
                  {/* Le titre composé avec la ville, sous le nom du logement (décision 2026-11-22-detail-titre-compose-sous-titre). */}
                  {notification.booking?.composed_title && (
                    <ThemedText type="small" themeColor="textSecondary" testID="notification-detail-composed-title">
                      {notification.booking.composed_title}
                    </ThemedText>
                  )}
                  {/* Le texte, pour une notification sans demande : une demande se dit par ses lignes
                      (décision 2026-11-20-titre-demande). */}
                  {!notification.booking && (
                    <NotificationText
                      type="default"
                      body={notification.summary ?? notification.body}
                      links={notification.text_links ?? []}
                      onLink={go}
                      testID="notification-detail-text"
                    />
                  )}
                  {/* Les lignes de la demande, dans l'ordre servi, le libellé à gauche et la valeur à droite :
                      les deux premières, toujours ; puis « Voir plus » déplie la suite : coordonnées, dates, durée, prix,
                      total en gras (décisions 2026-11-20-lignes-demande, 2026-11-21-detail-reservation-voir-plus et
                      2026-11-21-voir-plus-apres-une-ligne). */}
                  {firstLines.map(renderLine)}
                  {open && moreLines.map(renderLine)}
                  {/* À la fin, même dépliée, à droite, sans icône : « Voir plus » / « Voir moins »
                      (décision 2026-11-21-detail-reservation-voir-plus). */}
                  {moreLines.length > 0 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      onPress={() => setOpen((value) => !value)}
                      style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                      testID="notification-detail-more">
                      <ThemedText type="linkPrimary" testID="notification-detail-more-label">
                        {t(open ? 'notifications.less' : 'notifications.more')}
                      </ThemedText>
                    </Pressable>
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
          {/* Le bouton dans la barre fixe du bas : « Traiter la demande » (le propriétaire), « Mes réservations » ou « Modifier » tant qu'elle est en attente (le membre). */}
          {notification?.link && APP_LINK.test(notification.link) && (
            <FixedButtonBar
              label={notification.link_label ?? t('notifications.open')}
              onPress={() => notification.link && go(notification.link)}
              // « Annuler », à gauche, tant que le membre peut annuler sa demande (décision 2026-11-21-annuler-depuis-le-detail).
              secondary={
                notification.secondary_link && notification.secondary_link_label && APP_LINK.test(notification.secondary_link)
                  ? { label: notification.secondary_link_label, onPress: () => notification.secondary_link && go(notification.secondary_link) }
                  : null
              }
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
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  // La pastille seule, à gauche.
  tagRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  // La valeur à droite de son libellé, sur plusieurs lignes au besoin.
  dateValue: { flexShrink: 1, textAlign: 'right' },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  date: { textAlign: 'right' },
  total: { fontWeight: '700' },
  // Le nom de l'offre, en gras.
  offerLink: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, alignSelf: 'flex-end' },
});
