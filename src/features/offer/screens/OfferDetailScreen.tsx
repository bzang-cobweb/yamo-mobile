import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { takeProfileNotice } from '@/features/auth/utils/profile-notice';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { FavoriteHeart } from '@/features/list/components/FavoriteHeart';
import { ApiError, NetworkError } from '@/shared/api/errors';
import { Accordion } from '@/shared/components/Accordion';
import { BackHeader } from '@/shared/components/BackHeader';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferReviews, openReviewForm, reviewActions, useReviewRemoval } from '../components/OfferReviews';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { useOfferDetail } from '../hooks/useOfferDetail';
import type { OfferDetail } from '../types';

/**
 * Fiche d'une offre (`/offers/[id]`, décision 2026-11-18-fiche-offre), pour un
 * visiteur comme pour un membre, décrite par l'API : les photos en carrousel,
 * le titre, le prix, la ville, les caractéristiques, la description et la date de
 * publication, puis les avis (décision 2026-11-19-contrat-avis-offres). Une offre
 * introuvable affiche un message ; le retour ramène à l'accueil.
 *
 * Au retour du formulaire d'avis, ou après le retrait du sien, la fiche et les
 * listes se rechargent, et le message de l'API s'affiche.
 */
export function OfferDetailScreen({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const query = useOfferDetail(id);
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, MaxContentWidth / 2);
  const offer = query.data;
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<{ message: string; failed: boolean } | null>(null);
  const shown = useRef(false);
  const { refetch } = query;

  // Un avis donné ou retiré : la fiche, et les listes (note, dernier avis), sont à recharger.
  const changed = useCallback(
    (message: string | null, failed = false) => {
      setNotice(message === null ? null : { message, failed });
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['list'] });
    },
    [queryClient, refetch],
  );

  useFocusEffect(
    useCallback(() => {
      // Le premier affichage charge déjà la fiche ; au retour du formulaire, son message.
      if (shown.current) {
        const message = takeProfileNotice();

        if (message !== null) {
          changed(message);
        }
      }
      shown.current = true;
    }, [changed]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={offer?.title ?? ''} />
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="offer-loading" />
            </View>
          ) : !offer ? (
            <View style={styles.center}>
              <ThemedText themeColor="textSecondary" style={styles.centered} accessibilityRole="alert" testID="offer-unavailable">
                {query.error instanceof ApiError && query.error.status === 404
                  ? t('offer.unavailable')
                  : query.error instanceof NetworkError
                    ? t('offline.message')
                    : t('error.unknown')}
              </ThemedText>
              {!(query.error instanceof ApiError && query.error.status === 404) && (
                <Pressable accessibilityRole="button" testID="offer-retry" onPress={() => query.refetch()}>
                  <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} testID="offer-detail">
              <View style={{ width, alignSelf: 'center' }}>
                <PhotoCarousel photos={offer.photos} width={width} />
                {/* Le cœur d'un membre connecté, en haut à droite (décision 2026-11-19-contrat-vedette-favoris). */}
                {offer.favorite && <FavoriteHeart favorite={offer.favorite} testID="offer-favorite" />}
              </View>
              <View style={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
                {offer.status && (
                  <ThemedText type="small" themeColor="textSecondary" testID="offer-status">
                    {offer.status.label}
                  </ThemedText>
                )}
                <ThemedText type="subtitle" testID="offer-title">
                  {offer.title}
                </ThemedText>
                {/* Le prix n'est plus ici : il est dans la barre fixe (décision 2026-11-19-contrat-reservations). */}

                {/* Puis la description, la localisation, les caractéristiques. */}
                {/* La description seule, sans titre (décision 2026-11-19-fiche-description-equipements). */}
                {offer.description && (
                  <View style={styles.section}>
                    <ThemedText testID="offer-description">{offer.description}</ThemedText>
                  </View>
                )}

                {/* Les sections repliables, complètes, dans l'ordre et l'ouverture servis par
                    Laravel (décisions 2026-11-19-sections-fiche-laravel et
                    2026-11-19-sections-construites-laravel) : un seul aiguillage, sur le type. */}
                {(offer.sections ?? []).map((section) => {
                  switch (section.type) {
                    // Lignes « libellé — valeur » : caractéristiques, règles.
                    case 'rows':
                      return (
                        <Accordion key={section.key} title={section.title} initiallyOpen={section.open} testID={`offer-section-${section.key}`}>
                          {(section.rows ?? []).map((row) => (
                            <FactRow key={row.label} fact={row} testID={`offer-${section.key}-row`} />
                          ))}
                        </Accordion>
                      );
                    // Un texte et sa note : la localisation (adresse, indication), un bloc d'informations.
                    case 'text':
                      return (
                        <Accordion key={section.key} title={section.title} initiallyOpen={section.open} testID={`offer-section-${section.key}`}>
                          <TextSection text={section.text ?? ''} note={section.note} testID={`offer-${section.key}`} />
                        </Accordion>
                      );
                    case 'reviews':
                      return offer.reviews ? (
                        <Accordion key={section.key} title={section.title} initiallyOpen={section.open} testID={`offer-section-${section.key}`}>
                          <OfferReviews offerId={offer.id} reviews={offer.reviews} />
                        </Accordion>
                      ) : null;
                    default:
                      return null;
                  }
                })}

                {/* Le message d'un avis donné ou retiré. */}
                {notice && (
                  <ThemedText
                    type="small"
                    style={notice.failed ? styles.error : { color: theme.primary }}
                    accessibilityRole="alert"
                    testID="offer-notice">
                    {notice.message}
                  </ThemedText>
                )}

                {offer.published_at && (
                  <ThemedText type="small" themeColor="textSecondary" testID="offer-published">
                    {t('offer.publishedOn', { date: new Date(offer.published_at).toLocaleDateString(locale, { dateStyle: 'long' }) })}
                  </ThemedText>
                )}
              </View>
            </ScrollView>
          )}
          {/* Barre fixe en bas : les boutons d'avis, le prix et le bouton de réservation
              (décisions 2026-11-19-contrat-reservations et 2026-11-20-boutons-avis-fiche). */}
          {offer && <BookingBar offer={offer} onReviewChanged={changed} />}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * Le prix à gauche, le bouton à droite (« Réserver », « Demander une visite »). Un
 * visiteur passe d'abord par la connexion ; un membre ouvre le formulaire décrit par
 * Laravel, lié à l'offre. Sa propre offre : « Modifier », qui ouvre le formulaire de
 * l'offre (décision 2026-11-19-fiche-bouton-modifier) ; après l'enregistrement, la
 * fiche se recharge. Au-dessus, sur une ligne, les boutons d'avis que donne
 * `reviewActions` (décision 2026-11-20-boutons-avis-fiche). Rien à montrer : pas de barre.
 */
function BookingBar({ offer, onReviewChanged }: { offer: OfferDetail; onReviewChanged: (message: string | null, failed?: boolean) => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const booking = offer.booking;
  const edit = offer.edit;
  const empty = { average: null, count: 0, latest: [], mine: null, can_review: false, delete: null };
  const reviews = offer.reviews ?? empty;
  const removeReview = useReviewRemoval(reviews, onReviewChanged);
  const actions = offer.reviews ? reviewActions(offer.reviews, user !== null).bar.filter((action) => action !== 'delete' || removeReview !== null) : [];

  if (!offer.price && !booking && !edit && actions.length === 0) {
    return null;
  }

  return (
    <View
      testID="offer-booking-bar"
      style={[styles.bar, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      {actions.length > 0 && (
        <View style={[styles.barReviews, { maxWidth: MaxContentWidth / 2 }]} testID="offer-review-bar">
          {actions.map((action) => (
            <Pressable
              key={action}
              testID={`offer-review-bar-${action}`}
              accessibilityRole="button"
              onPress={() => (action === 'delete' ? removeReview?.() : openReviewForm(offer.id))}
              style={({ pressed }) => [styles.reviewButton, { borderColor: action === 'delete' ? ERROR_COLOR : theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: action === 'delete' ? ERROR_COLOR : theme.primary }}>
                {action === 'delete' ? (reviews.delete?.label ?? '') : action === 'edit' ? t('offer.editReview') : t('offer.writeReview')}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
      {(offer.price || booking || edit) && (
      <View style={[styles.barContent, { maxWidth: MaxContentWidth / 2 }]}>
        <View style={styles.barPrice}>
          {offer.price && (
            <ThemedText type="smallBold" style={{ color: theme.primary }} testID="offer-price">
              {offer.price.value}
            </ThemedText>
          )}
        </View>
        {booking && (
          <Pressable
            testID="offer-booking"
            accessibilityRole="button"
            onPress={() =>
              user === null ? router.push('/sign-in') : router.push({ pathname: '/offers/[id]/book', params: { id: offer.id } })
            }
            style={({ pressed }) => [styles.bookButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {booking.label}
            </ThemedText>
          </Pressable>
        )}
        {!booking && edit && (
          <Pressable
            testID="offer-edit"
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/profile/[form]', params: { form: edit.form, record: offer.id } })}
            style={({ pressed }) => [styles.bookButton, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {edit.label}
            </ThemedText>
          </Pressable>
        )}
      </View>
      )}
    </View>
  );
}

/**
 * Le contenu d'une section `text` (la localisation, un bloc d'informations) : le
 * texte, sa note en dessous s'il y en a une, et le séparateur à la fin
 * (décision 2026-11-19-sections-construites-laravel).
 */
function TextSection({ text, note, testID }: { text: string; note?: string | null; testID: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.text, { borderBottomColor: theme.backgroundSelected }]}>
      <ThemedText testID={`${testID}-text`}>{text}</ThemedText>
      {note && (
        <ThemedText type="small" themeColor="textSecondary" testID={`${testID}-note`}>
          {note}
        </ThemedText>
      )}
    </View>
  );
}

/** Une ligne « libellé — valeur », des caractéristiques comme des règles. */
function FactRow({ fact, testID }: { fact: { label: string; value: string }; testID: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.fact, { borderBottomColor: theme.backgroundSelected }]} testID={testID}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.factLabel}>
        {fact.label}
      </ThemedText>
      {/* Une valeur longue (les équipements) passe à la ligne ; le libellé reste visible. */}
      <ThemedText type="small" style={styles.factValue}>
        {fact.value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centered: { textAlign: 'center' },
  content: { paddingBottom: Spacing.five },
  body: { width: '100%', alignSelf: 'center', gap: Spacing.two, padding: Spacing.four },
  section: { gap: Spacing.one, marginTop: Spacing.three },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  // Le texte d'une section, et le séparateur à sa fin.
  text: { gap: Spacing.one, paddingBottom: Spacing.two, borderBottomWidth: 1 },
  factLabel: { flexShrink: 0, maxWidth: '45%' },
  factValue: { flexShrink: 1, textAlign: 'right' },
  error: { color: ERROR_COLOR },
  bar: { borderTopWidth: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.four },
  barContent: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  barPrice: { flex: 1 },
  barReviews: { width: '100%', alignSelf: 'center', flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  reviewButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: Spacing.two },
  bookButton: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: 12, alignItems: 'center' },
  pressed: { opacity: 0.7 },
});
