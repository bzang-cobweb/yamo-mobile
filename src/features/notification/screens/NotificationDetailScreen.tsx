import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileFormSheet, profileFormLink } from '@/features/auth/components/ProfileFormSheet';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { DropdownMenu } from '@/shared/components/DropdownMenu';
import { FixedButtonBar } from '@/shared/components/FixedButtonBar';
import { Quote } from '@/shared/components/Quote';
import { showToast } from '@/shared/components/Toast';
import { StatusTag } from '@/shared/components/StatusTag';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { NotificationConversation } from '../components/NotificationConversation';
import { APP_LINK, NotificationText } from '../components/NotificationText';
import { SummaryLineRow } from '../components/SummaryLines';
import { useMarkRead, useNotification } from '../hooks/useNotifications';

/**
 * La page d'une notification (`/notifications/[id]`), ouverte depuis la liste
 * (décision 2026-11-20-suivi-conversation) :
 * - dans la barre du haut, le type de la notification (« Demande de logement ») ;
 * - dans le menu « ⋮ », « Info » : la pastille, l'en-tête (ou le texte) et les lignes (décision 2026-11-27-detail-sans-zone-fixe) ;
 * - la page, ce qui défile : le suivi de la demande comme une conversation, le membre
 *   de l'autre partie à gauche, celles du lecteur à droite (« Toi ») ; sans demande, le message joint et la date ;
 * - dans la barre fixe du bas, un bouton vers l'écran qu'elle désigne (« Traiter la demande »).
 *
 * Ouverte, elle est marquée lue.
 */
export function NotificationDetailScreen({ id }: { id: string }) {
  const { t } = useI18n();
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

  // Le fil s'ouvre sur son dernier message (décision 2026-11-27-fil-dernier-message) : en bas, à l'ouverture et à chaque
  // nouveau message ; tant que le lecteur n'a pas remonté le fil lui-même, la page suit le contenu qui grandit.
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const follow = useRef(true);
  const steps = useRef(-1);
  const stepCount = (notification?.history ?? []).length;
  if (stepCount !== steps.current) {
    follow.current = true;
  }

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

  // Le menu « ⋮ » de la barre du haut et son panneau « Info » : le titre, le sous-titre et les lignes (décision
  // 2026-11-27-notification-menu-info).
  const [menuOpen, setMenuOpen] = useState(false);
  const [info, setInfo] = useState(false);
  const infoLines = notification?.booking?.lines ?? notification?.lines ?? [];
  // Les entrées servies (décision 2026-11-27-menu-notification-serveur) : un lien ouvre son écran ou son formulaire ; sans
  // lien, `info` ouvre son panneau, titré du libellé de l'entrée (décision 2026-11-27-info-titre-du-menu). Une entrée que
  // l'app ne sait pas ouvrir n'est pas montrée.
  const infoEntry = notification?.menu?.find((entry) => entry.key === 'info' && !entry.link) ?? null;
  const menuEntries = (notification?.menu ?? []).flatMap((entry) => {
    if (entry.link && APP_LINK.test(entry.link)) {
      const link = entry.link;
      return [{ key: entry.key, label: entry.label, onPress: () => act(link) }];
    }
    if (entry === infoEntry) {
      return [{ key: entry.key, label: entry.label, onPress: () => setInfo(true) }];
    }
    return [];
  });

  // Un lien suivi depuis « Info » ferme d'abord le panneau, qui couvrirait l'écran ouvert.
  function openFromInfo(link: string) {
    setInfo(false);
    go(link);
  }

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
          <BackHeader
            // Le titre de l'en-tête (« Déménagement Express Douala »), à défaut celui de la notification (décision
            // 2026-11-27-page-titre-entete).
            title={notification?.heading?.title || notification?.title || t('notifications.detail')}
            right={
              menuEntries.length > 0 ? (
                <DropdownMenu
                  entries={menuEntries}
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                  accessibilityLabel={t('notifications.actions')}
                  testID="notification-detail-menu"
                />
              ) : null
            }
          />
          {/* Menu ouvert : un toucher ailleurs le ferme. */}
          {menuOpen && <Pressable style={StyleSheet.absoluteFill} accessibilityElementsHidden onPress={() => setMenuOpen(false)} testID="notification-detail-menu-backdrop" />}
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
            // Plus de zone fixe en haut (décision 2026-11-27-detail-sans-zone-fixe) : l'en-tête, la pastille, le texte et
            // les lignes sont dans « Info » ; la page n'est que le fil.
            <>
              {/* Sans marge ajoutée par iOS en haut du contenu. */}
              <ScrollView
                ref={scroll}
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={[styles.body, { maxWidth: MaxContentWidth / 2 }]}
                onScrollBeginDrag={() => {
                  follow.current = false;
                }}
                onContentSizeChange={() => {
                  if (!follow.current) {
                    return;
                  }
                  // Sans animation à l'ouverture ; un nouveau message glisse en vue.
                  scroll.current?.scrollToEnd({ animated: steps.current >= 0 && steps.current !== stepCount });
                  steps.current = stepCount;
                }}
                testID="notification-detail-scroll">
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
          {/* « Info » : titré du libellé de son entrée du menu (décision 2026-11-27-info-titre-du-menu) ; dessous, la pastille,
              le titre et le sous-titre de l'en-tête (ou le texte), puis ses lignes s'il y en a. */}
          {notification && infoEntry && (
            <BottomSheet visible={info} title={infoEntry.label} onClose={() => setInfo(false)} testID="notification-detail-info">
              <ScrollView style={styles.infoScroll} contentContainerStyle={styles.infoBody}>
                {notification.tag && (
                  <View style={styles.tagRow} testID="notification-detail-tag-row">
                    <StatusTag tag={notification.tag} testID="notification-detail-tag" />
                  </View>
                )}
                {/* Le titre en gras, en lien vers sa page s'il en a une (le nom du logement vers sa fiche). */}
                {notification.heading && (
                  <ThemedText
                    accessibilityRole={notification.heading.link ? 'link' : undefined}
                    onPress={notification.heading.link ? () => notification.heading?.link && openFromInfo(notification.heading.link) : undefined}
                    style={[styles.heading, styles.linkOnly]}
                    testID="notification-detail-info-title">
                    {notification.heading.title}
                  </ThemedText>
                )}
                {notification.heading?.subtitle && (
                  <ThemedText type="small" themeColor="textSecondary" testID="notification-detail-info-subtitle">
                    {notification.heading.subtitle}
                  </ThemedText>
                )}
                {/* Sans en-tête, le texte de la notification, sans le nom de qui agit (décision 2026-11-20-titre-demande). */}
                {!notification.heading && (
                  <NotificationText
                    type="default"
                    body={notification.summary ?? notification.body}
                    links={notification.text_links ?? []}
                    onLink={openFromInfo}
                    testID="notification-detail-text"
                  />
                )}
                {/* Le titre des lignes, servi par le module du fil (« Détails », « Modifications »). */}
                {infoLines.length > 0 && notification.lines_title && (
                  <ThemedText type="smallBold" testID="notification-detail-info-lines-title">
                    {notification.lines_title}
                  </ThemedText>
                )}
                {infoLines.map((line) => (
                  <SummaryLineRow
                    key={line.key}
                    line={line}
                    onOpen={openFromInfo}
                    testID="notification-detail-info"
                  />
                ))}
              </ScrollView>
            </BottomSheet>
          )}
          {/* Envoyé : le panneau se ferme, le message s'affiche, la demande est relue (ses dates, son statut). */}
          <ProfileFormSheet
            link={form}
            // À la hauteur du formulaire (« Répondre » : un message), comme sur la fiche d'une offre ; un long formulaire
            // (« Modifier ») va jusqu'à la taille maximale (décision 2026-11-27-repondre-en-panneau).
            fitContent
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
  // Le lien sur le texte seul (décision 2026-11-22-liens-sur-le-texte).
  linkOnly: { alignSelf: 'flex-start' },
  // La pastille du statut, en tête du panneau « Info ».
  tagRow: { flexDirection: 'row' },
  body: { width: '100%', alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  date: { textAlign: 'right' },
  // Le titre de l'en-tête, en gras.
  heading: { fontWeight: '700' },
  // Le panneau « Info » : à sa taille maximale (décision 2026-11-27-info-taille-maximale), il défile s'il dépasse.
  infoScroll: { flex: 1 },
  infoBody: { gap: Spacing.three, padding: Spacing.four },
});
