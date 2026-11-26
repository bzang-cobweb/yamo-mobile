import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileFormSheet, profileFormLink } from '@/features/auth/components/ProfileFormSheet';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { BookingSummary } from '@/features/offer/components/BookingSummary';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { Quote } from '@/shared/components/Quote';
import { showToast } from '@/shared/components/Toast';
import { StatusTag } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { NotificationConversation } from '../components/NotificationConversation';
import { APP_LINK, NotificationText } from '../components/NotificationText';
import { SummaryLines } from '../components/SummaryLines';
import { useMarkRead, useNotification } from '../hooks/useNotifications';

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
  const { t } = useI18n();
  const theme = useTheme();
  const query = useNotification(id);
  const markRead = useMarkRead();
  const { refetch } = query;
  // Au retour sur la page (un lien suivi, décision 2026-11-21-detail-reservation-modifier),
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

  function go(link: string) {
    if (APP_LINK.test(link)) {
      router.push(link as Href);
    }
  }

  // Le formulaire ouvert par un bouton du bas (« Modifier », « Annuler »), dans un panneau plutôt qu'un écran
  // (décision 2026-11-26-formulaires-en-panneau).
  const [form, setForm] = useState<string | null>(null);

  function act(link: string) {
    if (profileFormLink(link) !== null) {
      setForm(link);
    } else {
      go(link);
    }
  }

  // L'heure seule le jour même (décision 2026-11-20-suivi-conversation).
  // La date complète, formatée par le serveur (décision 2026-11-25-dates-formatees-serveur).
  const date = notification?.stamp ?? null;

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
                  {/* La pastille du statut seule, centrée : le type de location et de logement est dans la barre du haut
                      (décisions 2026-11-22-detail-sans-ligne-type et 2026-11-24-detail-statut-centre). */}
                  {notification.tag && (
                    <View style={styles.tagRow} testID="notification-detail-tag-row">
                      <StatusTag tag={notification.tag} testID="notification-detail-tag" />
                    </View>
                  )}
                  {/* L'en-tête servi par le module du fil (décision 2026-11-26-booking-summary) : le titre en gras, centré,
                      en lien vers sa page s'il en a une (le nom du logement vers sa fiche, décision
                      2026-11-21-detail-reservation-voir-plus) ; dessous, le sous-titre (le titre composé, décision
                      2026-11-22-detail-titre-compose-sous-titre). */}
                  {notification.heading && (
                    <ThemedText
                      accessibilityRole={notification.heading.link ? 'link' : undefined}
                      onPress={notification.heading.link ? () => notification.heading?.link && go(notification.heading.link) : undefined}
                      // Centré, le lien sur le texte seul (décision 2026-11-22-liens-sur-le-texte).
                      style={[styles.heading, styles.centered, styles.linkOnly]}
                      testID="notification-detail-heading-title">
                      {notification.heading.title}
                    </ThemedText>
                  )}
                  {notification.heading?.subtitle && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.centered} testID="notification-detail-heading-subtitle">
                      {notification.heading.subtitle}
                    </ThemedText>
                  )}
                  {/* Sans en-tête, le texte de la notification ; une demande se dit par son en-tête et ses lignes
                      (décision 2026-11-20-titre-demande). */}
                  {!notification.heading && (
                    <NotificationText
                      type="default"
                      body={notification.summary ?? notification.body}
                      links={notification.text_links ?? []}
                      onLink={go}
                      testID="notification-detail-text"
                    />
                  )}
                  {/* Ce qui est propre à une demande : ses lignes et « Voir plus ». */}
                  {notification.booking && <BookingSummary booking={notification.booking} title={notification.lines_title} onOpen={go} />}
                  {/* Les lignes servies par le module du fil (les dernières modifications d'un partenaire). */}
                  {notification.lines && notification.lines.length > 0 && <SummaryLines lines={notification.lines} title={notification.lines_title} onOpen={go} />}
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
              onPress={() => notification.link && act(notification.link)}
              // « Annuler », à gauche, tant que le membre peut annuler sa demande (décision 2026-11-21-annuler-depuis-le-detail).
              secondary={
                notification.secondary_link && notification.secondary_link_label && APP_LINK.test(notification.secondary_link)
                  ? { label: notification.secondary_link_label, onPress: () => notification.secondary_link && act(notification.secondary_link) }
                  : null
              }
              testID="notification-detail-open"
            />
          )}
          {/* Envoyé : le panneau se ferme, le message s'affiche, la demande est relue (ses dates, son statut). */}
          <ProfileFormSheet
            link={form}
            onClose={() => setForm(null)}
            onDone={(message) => {
              setForm(null);
              showToast(message);
              void refetch();
            }}
            testID="notification-detail-form"
          />
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
  // Le titre et le titre composé, centrés (décision 2026-11-22-detail-titres-centres).
  centered: { textAlign: 'center' },
  linkOnly: { alignSelf: 'center' },
  // La pastille seule, à gauche.
  // La pastille du statut, centrée comme le nom du logement en dessous (décision 2026-11-24-detail-statut-centre).
  tagRow: { flexDirection: 'row', justifyContent: 'center' },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  date: { textAlign: 'right' },
  // Le titre de l'en-tête, en gras.
  heading: { fontWeight: '700' },
});
