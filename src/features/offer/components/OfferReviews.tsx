import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileFormService, profileSubmission } from '@/features/auth/services/ProfileFormService';
import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { OfferReview as Review, OfferReviews as Reviews } from '../types';

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

/** Ouvre le formulaire d'avis de l'offre (`offer.review`), pour le donner ou le modifier. */
export function openReviewForm(offerId: string) {
  router.push({ pathname: '/offers/[id]/review', params: { id: offerId } });
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
 * moyenne en étoiles et le nombre d'avis, les derniers servis par l'API, puis le
 * bouton que donne `reviewActions` (« Donner mon avis », « Modifier mon avis » ou
 * « Voir tous les avis »). Un visiteur lit « Connectez-vous pour donner votre avis ».
 */
export function OfferReviews({ offerId, reviews }: { offerId: string; reviews: Reviews }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const average = reviews.average?.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '';
  const actions = reviewActions(reviews, user !== null);

  return (
    // Le titre « Avis » est celui de la section repliable de la fiche (décision 2026-11-19-fiche-localisation-accordeon).
    <View style={styles.section} testID="offer-reviews">

      {reviews.average !== null ? (
        <View
          style={styles.summary}
          accessible
          accessibilityLabel={t('list.ratingSummary', { average, count: String(reviews.count) })}
          testID="offer-reviews-summary">
          <Stars value={reviews.average} size={20} emptyColor={theme.backgroundSelected} />
          <ThemedText type="smallBold">{average}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{`(${reviews.count})`}</ThemedText>
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" testID="offer-reviews-empty">
          {t('offer.noReviews')}
        </ThemedText>
      )}

      {reviews.latest.map((review) => (
        <ReviewRow key={review.id} review={review} />
      ))}
      {actions.all && (
        <Pressable
          testID="offer-reviews-all"
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/offers/[id]/reviews', params: { id: offerId } })}
          style={({ pressed }) => [styles.button, { borderColor: theme.primary }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {t('offer.allReviews')}
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
            onPress={() => openReviewForm(offerId)}
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

/** Un avis : prénom, date, étoiles, commentaire ; sur la fiche comme dans la liste complète. */
export function ReviewRow({ review }: { review: Review }) {
  const { t, locale } = useI18n();
  const theme = useTheme();

  return (
    <View style={[styles.review, { borderBottomColor: theme.backgroundSelected }]} testID="offer-review">
      <View style={styles.reviewHead}>
        <ThemedText type="smallBold">{review.author}</ThemedText>
        {review.created_at && (
          <ThemedText type="small" themeColor="textSecondary">
            {new Date(review.created_at).toLocaleDateString(locale, { dateStyle: 'medium' })}
          </ThemedText>
        )}
      </View>
      <View accessible accessibilityLabel={t('form.ratingValue', { value: String(review.rating) })}>
        <Stars value={review.rating} emptyColor={theme.backgroundSelected} />
      </View>
      <ThemedText type="small">{review.comment}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  review: { gap: Spacing.half, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  button: { alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
});
