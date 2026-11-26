import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileFormService, profileSubmission } from '@/features/auth/services/ProfileFormService';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { FavoriteHeart } from '@/features/list/components/FavoriteHeart';
import { ApiError, NetworkError } from '@/shared/api/errors';
import { Accordion } from '@/shared/components/Accordion';
import { FloatingBack } from '@/shared/components/FloatingBack';
import { Stars } from '@/shared/components/Stars';
import { STATUS_ON_IMAGE, StatusTag } from '@/shared/components/StatusTag';
import { showToast } from '@/shared/components/Toast';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { OfferReviews, openReviewForm, reviewActions, useReviewRemoval } from '../components/OfferReviews';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { SectionAction } from '../components/SectionAction';
import { useOfferDetail } from '../hooks/useOfferDetail';
import { offerService } from '../services/OfferService';
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
  const { t } = useI18n();
  const theme = useTheme();
  const query = useOfferDetail(id);
  const { user } = useAuth();
  // Ouvrir la fiche, par n'importe quel lien, compte un clic ; l'API ne le compte pas pour son propriétaire (décision
  // 2026-11-25-clic-a-l-ouverture). Une fois par ouverture ; une erreur réseau ne gêne pas la fiche.
  useEffect(() => {
    void offerService.click(id).catch(() => undefined);
  }, [id]);
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth, MaxContentWidth / 2);
  const offer = query.data;
  const queryClient = useQueryClient();
  const shown = useRef(false);
  const { refetch } = query;

  // Un avis donné ou retiré : la fiche, et les listes (note, dernier avis), sont à recharger ; son
  // message dans le bandeau flottant (décision 2026-11-21-bandeau-messages).
  const changed = useCallback(
    (message: string | null, failed = false) => {
      if (message !== null) {
        showToast(message, failed ? 'danger' : 'success');
      }
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['list'] });
    },
    [queryClient, refetch],
  );

  useFocusEffect(
    useCallback(() => {
      // Le premier affichage charge déjà la fiche ; au retour (d'un avis, d'une demande), elle se recharge,
      // le message du formulaire étant déjà dans le bandeau.
      if (shown.current) {
        changed(null);
      }
      shown.current = true;
    }, [changed]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <View style={styles.container}>
            {query.isPending ? (
              <View style={styles.center}>
                {/* Sans photo (chargement, erreur) : le retour reste en haut à gauche. */}
                <FloatingBack />
                <ActivityIndicator testID="offer-loading" />
              </View>
            ) : !offer ? (
              <View style={styles.center}>
                <FloatingBack />
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
                  {/* Le retour, posé sur la photo : il défile avec elle (décision 2026-11-25-fiche-sans-barre). */}
                  <FloatingBack />
                  <PhotoCarousel
                    photos={offer.photos}
                    gallery={offer.gallery}
                    width={width}
                    // « Réserver » aussi dans la galerie, en bas (décision 2026-11-25-galerie-plein-ecran).
                    action={offer.booking ? { label: offer.booking.label, price: offer.price?.value ?? null, onPress: () => openBooking(offer.id, user !== null) } : null}
                  />
                  {/* Le cœur d'un membre connecté, en haut à droite (décision 2026-11-19-contrat-vedette-favoris) ;
                      pour le propriétaire, à cette place, le statut (décision 2026-11-21-statut-a-la-place-du-coeur). */}
                  {offer.favorite ? (
                    <FavoriteHeart favorite={offer.favorite} testID="offer-favorite" />
                  ) : (
                    offer.status && <StatusTag tag={offer.status} style={STATUS_ON_IMAGE} testID="offer-status" />
                  )}
                </View>
                <View style={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
                  {/* Le titre, puis le titre composé dessous, tous deux centrés (décision 2026-11-22-fiche-titres-centres). */}
                  <View style={styles.titles}>
                    <ThemedText type="subtitle" style={styles.centered} testID="offer-title">
                      {offer.title}
                    </ThemedText>
                    {offer.composed_title && (
                      <ThemedText themeColor="textSecondary" style={styles.centered} testID="offer-composed-title">
                        {offer.composed_title}
                      </ThemedText>
                    )}
                    {/* La note : étoiles, moyenne et nombre d'avis, centrée sous le titre composé (décision
                        2026-11-22-fiche-note-sous-titre). */}
                    {offer.reviews?.average != null && <TitleRating average={offer.reviews.average} count={offer.reviews.count} />}
                  </View>
                  {/* Le prix n'est plus ici : il est dans la barre fixe (décision 2026-11-19-contrat-reservations). */}

                  {/* Les sections repliables, complètes, dans l'ordre et l'ouverture servis par
                      Laravel (décisions 2026-11-19-sections-fiche-laravel et
                      2026-11-19-sections-construites-laravel) : un seul aiguillage, sur le type. */}
                  {(offer.sections ?? []).map((section, index) => {
                    // Les sections séparées par une bordure, rien dans leur contenu (décision
                    // 2026-11-25-fiche-bordures-sections) : une ligne au-dessus de chacune, sauf la première.
                    const separated = index > 0 ? [styles.separated, { borderTopColor: theme.backgroundSelected }] : undefined;
                    switch (section.type) {
                      // Lignes « libellé — valeur » : caractéristiques, règles.
                      case 'rows':
                        return (
                          <Accordion key={section.key} title={section.title} initiallyOpen={section.open} style={separated} testID={`offer-section-${section.key}`}>
                            {(section.rows ?? []).map((row) => (
                              <FactRow key={row.label} fact={row} testID={`offer-${section.key}-row`} />
                            ))}
                            {section.action && <SectionAction action={section.action} testID={`offer-${section.key}-action`} />}
                          </Accordion>
                        );
                      // Un texte et sa note : la localisation (adresse, indication), un bloc d'informations.
                      case 'text':
                        return (
                          <Accordion key={section.key} title={section.title} initiallyOpen={section.open} style={separated} testID={`offer-section-${section.key}`}>
                            <TextSection
                              text={section.text ?? ''}
                              note={section.note}
                              // La description, repliée à quelques lignes avec « Voir plus » (décisions
                              // 2026-11-22-description-voir-plus et 2026-11-22-fiche-sections-ordre).
                              collapsible={section.key === 'description'}
                              testID={`offer-${section.key}`}
                            />
                          </Accordion>
                        );
                      case 'reviews':
                        return offer.reviews ? (
                          <Accordion key={section.key} title={section.title} initiallyOpen={section.open} style={separated} testID={`offer-section-${section.key}`}>
                            <OfferReviews offerId={offer.id} reviews={offer.reviews} />
                          </Accordion>
                        ) : null;
                      default:
                        return null;
                    }
                  })}

                  {/* La date formatée par le serveur (décision 2026-11-25-dates-formatees-serveur). */}
                  {offer.published_on && (
                    <ThemedText type="small" themeColor="textSecondary" testID="offer-published">
                      {t('offer.publishedOn', { date: offer.published_on })}
                    </ThemedText>
                  )}
                </View>
              </ScrollView>
            )}
            {/* Barre fixe en bas : les boutons d'avis, le prix et le bouton de réservation
                (décisions 2026-11-19-contrat-reservations et 2026-11-20-boutons-avis-fiche). */}
            {offer && <BookingBar offer={offer} onReviewChanged={changed} />}
          </View>
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
 * fiche se recharge ; à la place du prix, « Retirer », en rouge, qui retire l'offre après confirmation et revient en
 * arrière (décision 2026-11-22-retirer-depuis-la-fiche). Au-dessus, sur une ligne, les boutons d'avis que donne
 * `reviewActions` (décision 2026-11-20-boutons-avis-fiche). Rien à montrer : pas de barre.
 */
/** « Réserver » : le formulaire de réservation, ou la connexion pour un visiteur. */
function openBooking(id: string, signedIn: boolean) {
  if (!signedIn) {
    router.push('/sign-in');

    return;
  }
  router.push({ pathname: '/offers/[id]/book', params: { id } });
}

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

  // Sa propre offre : « Retirer », en rouge, à la place du prix (décision 2026-11-22-retirer-depuis-la-fiche).
  const removal = edit && offer.delete ? profileSubmission(offer.delete) : null;

  function confirmRemove() {
    if (!offer.delete || removal === null) {
      return;
    }

    Alert.alert(offer.delete.confirm, undefined, [
      { text: t('list.cancel'), style: 'cancel' },
      {
        text: offer.delete.label,
        style: 'destructive',
        onPress: () =>
          void profileFormService
            .submit(removal, {})
            .then(() => {
              showToast(removal.success.message);
              router.back();
            })
            .catch(() => showToast(t('error.unknown'), 'danger')),
      },
    ]);
  }

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
          {removal && offer.delete ? (
            <Pressable testID="offer-delete" accessibilityRole="button" hitSlop={Spacing.two} onPress={confirmRemove} style={({ pressed }) => pressed && styles.pressed}>
              <ThemedText type="smallBold" style={{ color: ERROR_COLOR }}>
                {offer.delete.label}
              </ThemedText>
            </Pressable>
          ) : (
            offer.price && (
              <ThemedText type="smallBold" style={{ color: theme.primary }} testID="offer-price">
                {offer.price.value}
              </ThemedText>
            )
          )}
        </View>
        {booking && (
          <Pressable
            testID="offer-booking"
            accessibilityRole="button"
            onPress={() => openBooking(offer.id, user !== null)}
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
 * La note moyenne sous les titres : les étoiles seules, centrées ; la moyenne et le nombre d'avis restent
 * dans le libellé d'accessibilité (décision 2026-11-26-fiche-etoiles-seules).
 */
function TitleRating({ average, count }: { average: number; count: number }) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const shown = average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <View accessible accessibilityLabel={t('list.ratingSummary', { average: shown, count: String(count) })} style={styles.titleRating} testID="offer-title-rating">
      <Stars value={average} size={18} emptyColor={theme.backgroundSelected} />
    </View>
  );
}

/** Les lignes de la description visibles avant « Voir plus » (décision 2026-11-22-description-voir-plus). */
const DESCRIPTION_LINES = 4;

/**
 * La description, repliée à `DESCRIPTION_LINES` lignes quand elle est plus longue, avec « Voir plus » / « Voir moins »
 * dessous, à droite, comme les lignes d'une demande (décision 2026-11-22-description-voir-plus). Ses lignes sont
 * comptées au premier affichage, texte entier.
 */
function Description({ text, testID }: { text: string; testID: string }) {
  const { t } = useI18n();
  const [lines, setLines] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const long = lines !== null && lines > DESCRIPTION_LINES;

  return (
    <View>
      <ThemedText
        type="small"
        testID={testID}
        numberOfLines={long && !open ? DESCRIPTION_LINES : undefined}
        onTextLayout={(event) => {
          if (lines === null) {
            setLines(event.nativeEvent.lines.length);
          }
        }}>
        {text}
      </ThemedText>
      {long && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          hitSlop={Spacing.one}
          onPress={() => setOpen((value) => !value)}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          testID={`${testID}-more`}>
          <ThemedText type="linkPrimary">{t(open ? 'offer.less' : 'offer.more')}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Le contenu d'une section `text` (la localisation, un bloc d'informations) : le
 * texte et sa note en dessous s'il y en a une, sans séparateur (décision 2026-11-25-fiche-bordures-sections)
 * (décision 2026-11-19-sections-construites-laravel).
 */
function TextSection({ text, note, collapsible = false, testID }: { text: string; note?: string | null; collapsible?: boolean; testID: string }) {
  return (
    <View style={styles.text}>
      {collapsible ? <Description text={text} testID={`${testID}-text`} /> : <ThemedText type="small" testID={`${testID}-text`}>{text}</ThemedText>}
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
  return (
    <View style={styles.fact} testID={testID}>
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
  titles: { gap: Spacing.one },
  titleRating: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  more: { alignSelf: 'flex-end', paddingTop: Spacing.one },
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centered: { textAlign: 'center' },
  content: { paddingBottom: Spacing.five },
  body: { width: '100%', alignSelf: 'center', gap: Spacing.two, padding: Spacing.four },
  fact: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three, paddingVertical: Spacing.one },
  // Le texte d'une section, et le séparateur à sa fin.
  // Le même texte et les mêmes marges que les lignes des caractéristiques (décision 2026-11-22-fiche-texte-comme-lignes).
  text: { gap: Spacing.one, paddingVertical: Spacing.one },
  factLabel: { flexShrink: 0, maxWidth: '45%' },
  factValue: { flexShrink: 1, textAlign: 'right' },
  error: { color: ERROR_COLOR },
  separated: { borderTopWidth: 1, paddingTop: Spacing.three },
  bar: { borderTopWidth: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.four },
  barContent: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  barPrice: { flex: 1 },
  barReviews: { width: '100%', alignSelf: 'center', flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  reviewButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingVertical: Spacing.two },
  bookButton: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, borderRadius: 12, alignItems: 'center' },
  pressed: { opacity: 0.7 },
});
