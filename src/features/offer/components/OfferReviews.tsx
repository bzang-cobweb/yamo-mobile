import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { setFilterValues } from '@/features/list/utils/filters';
import { profileFormService, profileSubmission } from '@/features/auth/services/ProfileFormService';
import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import type { OfferReview as Review, OfferReviews as Reviews } from '../types';

/** La liste de tous les avis d'une offre, servie par l'API, l'offre en filtre caché (décision 2026-11-25-liste-avis-generique). */
export const OFFER_REVIEWS_LIST = 'offer.reviews';

/** Le formulaire servi par l'API pour donner son avis. */
export const REVIEW_FORM = 'offer.review';

/** Un bouton d'avis : donner le sien, le modifier, le supprimer. */
export type ReviewAction = 'write' | 'edit' | 'delete';

/**
 * Les boutons d'avis de la fiche (décision 2026-11-20-boutons-avis-fiche) :
 * - aucun avis : « Donner mon avis » dans la section ;
 * - un seul avis, le sien : « Modifier mon avis » dans la section ;
 * - des avis, aucun du membre : « Voir tous les avis » dans la section, « Donner mon
 *   avis » dans la barre fixe du bas ;
 * - plusieurs avis dont le sien : « Voir tous les avis » dans la section, « Modifier »
 *   et « Supprimer » dans la barre fixe.
 * La suppression n'est jamais dans la section. Sans droit d'avis (visiteur,
 * propriétaire), seul « Voir tous les avis » reste.
 */
export function reviewActions(reviews: Reviews, signedIn: boolean): { section: ReviewAction | null; all: boolean; bar: ReviewAction[] } {
  const can = signedIn && reviews.can_review;
  const mine = reviews.mine !== null;

  if (reviews.count === 0) {
    return { section: can && !mine ? 'write' : null, all: false, bar: [] };
  }
  if (mine && reviews.count === 1) {
    return { section: can ? 'edit' : null, all: false, bar: [] };
  }
  if (mine) {
    return { section: null, all: true, bar: can ? ['edit', ...(reviews.delete ? (['delete'] as const) : [])] : [] };
  }

  return { section: null, all: true, bar: can ? ['write'] : [] };
}

/**
 * Le lien du formulaire d'avis de l'offre (`offer.review`), pour le donner ou le modifier : la fiche l'ouvre dans un
 * panneau à sa hauteur (décision 2026-11-26-avis-en-panneau).
 */
export function reviewFormLink(offerId: string): string {
  return `/profile/${REVIEW_FORM}?record=${offerId}`;
}

/**
 * Retirer son avis, après confirmation ; `onChanged` reçoit le message de l'API.
 * `null` : rien à retirer.
 */
export function useReviewRemoval(reviews: Reviews, onChanged: (message: string | null, failed?: boolean) => void): (() => void) | null {
  const { t } = useI18n();
  const removal = reviews.delete ? profileSubmission(reviews.delete) : null;

  if (removal === null || !reviews.delete) {
    return null;
  }
  const remove = reviews.delete;

  async function submit() {
    if (removal === null) {
      return;
    }

    try {
      await profileFormService.submit(removal, {});
      onChanged(removal.success.message);
    } catch {
      onChanged(t('error.unknown'), true);
    }
  }

  return () =>
    Alert.alert(remove.confirm, undefined, [
      { text: t('list.cancel'), style: 'cancel' },
      { text: remove.label, style: 'destructive', onPress: () => void submit() },
    ]);
}

/**
 * Section « Avis » de la fiche (décision 2026-11-19-contrat-avis-offres) : la
 * moyenne dans le titre de la section, servi par l'API ; les derniers avis servis, puis le
 * bouton que donne `reviewActions` (« Donner mon avis », « Modifier mon avis » ou
 * « Voir tous les avis »). Un visiteur lit « Connectez-vous pour donner votre avis ».
 */
export function OfferReviews({ offerId, reviews, onWrite }: { offerId: string; reviews: Reviews; onWrite: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const actions = reviewActions(reviews, user !== null);
  const { width } = useWindowDimensions();
  // La largeur du contenu de la fiche, ses marges ôtées ; une carte en laisse voir la suivante.
  const contentWidth = Math.min(width, MaxContentWidth / 2) - 2 * Spacing.four;
  const cardWidth = Math.round(contentWidth * 0.85);

  return (
    // Le titre « Avis » est celui de la section repliable de la fiche (décision 2026-11-19-fiche-localisation-accordeon).
    <View style={styles.section} testID="offer-reviews">

      {/* La note moyenne est dans le titre de la section, « Avis (4,7) » (décision 2026-11-25-avis-note-dans-le-titre) ;
          sans avis, une phrase le dit. */}
      {reviews.count === 0 && (
        <ThemedText type="small" themeColor="textSecondary" testID="offer-reviews-empty">
          {t('offer.noReviews')}
        </ThemedText>
      )}

      {/* Les derniers avis servis (10, réglés par Laravel) en carrousel horizontal (décision
          2026-11-25-fiche-avis-carrousel) ; un seul avis prend toute la largeur. */}
      {reviews.latest.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={reviews.latest.length > 1 ? cardWidth + Spacing.two : undefined}
          decelerationRate="fast"
          style={styles.carouselFrame}
          contentContainerStyle={styles.carousel}
          testID="offer-reviews-carousel">
          {reviews.latest.map((review) => (
            <View
              key={review.id}
              style={[styles.card, { width: reviews.latest.length > 1 ? cardWidth : contentWidth, borderColor: theme.backgroundSelected }]}
              testID="offer-review-card">
              <ReviewRow review={review} bordered={false} lines={CARD_LINES} />
            </View>
          ))}
        </ScrollView>
      )}
      {actions.all && (
        <Pressable
          testID="offer-reviews-all"
          accessibilityRole="button"
          onPress={() => {
            // L'offre choisie avant d'ouvrir la liste des avis (décision 2026-11-25-liste-avis-generique).
            setFilterValues(OFFER_REVIEWS_LIST, { offer: offerId });
            router.push({ pathname: '/offers/[id]/reviews', params: { id: offerId } });
          }}
          style={({ pressed }) => [styles.button, { borderColor: theme.primary }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {t('offer.allReviews', { count: String(reviews.count) })}
          </ThemedText>
        </Pressable>
      )}

      {user === null ? (
        <ThemedText type="small" themeColor="textSecondary" testID="offer-reviews-sign-in">
          {t('offer.signInToReview')}
        </ThemedText>
      ) : (
        actions.section !== null && (
          <Pressable
            testID="offer-review-write"
            accessibilityRole="button"
            onPress={onWrite}
            style={({ pressed }) => [styles.button, { borderColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {actions.section === 'edit' ? t('offer.editReview') : t('offer.writeReview')}
            </ThemedText>
          </Pressable>
        )
      )}
    </View>
  );
}

/**
 * Un avis : prénom, étoiles · date, commentaire ; sur la fiche comme dans la liste complète. Sur la fiche, sans bordure
 * (`bordered={false}`) : seules les sections en ont (décision 2026-11-25-fiche-bordures-sections).
 */
export function ReviewRow({ review, bordered = true, lines }: { review: Review; bordered?: boolean; lines?: number }) {
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <View style={[styles.review, bordered && { borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected }]} testID="offer-review">
      {/* Le prénom ; puis les étoiles et la date sur une ligne, séparées par un point ; puis le commentaire (décision
          2026-11-25-avis-note-et-date-sur-une-ligne). */}
      <ThemedText type="smallBold">{review.author}</ThemedText>
      <View style={styles.meta}>
        <View accessible accessibilityLabel={t('form.ratingValue', { value: String(review.rating) })} testID="offer-review-stars">
          {/* L'étoile vide en gris du texte secondaire, à 40 % : visible sur le fond des cartes (décision
              2026-11-25-avis-etoile-vide-visible). */}
          <Stars value={review.rating} emptyColor={`${theme.textSecondary}66`} testID="offer-review-stars-value" />
        </View>
        {/* La date formatée par le serveur, la même que dans la liste des avis (décision 2026-11-25-dates-formatees-serveur). */}
        {review.date && (
          <ThemedText type="small" themeColor="textSecondary" testID="offer-review-date">
            {`· ${review.date}`}
          </ThemedText>
        )}
      </View>
      <ThemedText type="small" numberOfLines={lines}>
        {review.comment}
      </ThemedText>
    </View>
  );
}

/** Les lignes du commentaire dans une carte du carrousel : des cartes de même hauteur. */
const CARD_LINES = 4;

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  carousel: { gap: Spacing.two },
  // Plus d'air sous le carrousel, avant « Voir tous les avis » (décision 2026-11-26-avis-espace-sous-carrousel).
  carouselFrame: { marginBottom: Spacing.two },
  // Sans fond, une bordure tout autour, coins arrondis comme les cartes des listes (décision
  // 2026-11-25-avis-cartes-bordures).
  card: { borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.three },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  review: { gap: Spacing.half, paddingVertical: Spacing.two },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  button: { alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
