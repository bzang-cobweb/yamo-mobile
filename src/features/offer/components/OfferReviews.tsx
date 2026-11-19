import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { profileFormService, profileSubmission } from '@/features/auth/services/ProfileFormService';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { OfferReview as Review, OfferReviews as Reviews } from '../types';

/** Le formulaire servi par l'API pour donner son avis. */
export const REVIEW_FORM = 'offer.review';

/**
 * Section « Avis » de la fiche (décision 2026-11-19-contrat-avis-offres) : la
 * moyenne en étoiles et le nombre d'avis, les 5 derniers, puis « Donner mon avis »
 * ou « Modifier mon avis » (formulaire `offer.review`) et « Supprimer mon avis ».
 * Un visiteur lit « Connectez-vous pour donner votre avis » ; le propriétaire ne
 * voit aucun bouton. `onChanged` : après un retrait, avec le message de l'API.
 */
export function OfferReviews({ offerId, reviews, onChanged }: { offerId: string; reviews: Reviews; onChanged: (message: string | null, failed?: boolean) => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const removal = reviews.delete ? profileSubmission(reviews.delete) : null;
  const average = reviews.average?.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) ?? '';

  async function remove() {
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

  function confirmRemove() {
    if (!reviews.delete) {
      return;
    }

    Alert.alert(reviews.delete.confirm, undefined, [
      { text: t('list.cancel'), style: 'cancel' },
      { text: reviews.delete.label, style: 'destructive', onPress: () => void remove() },
    ]);
  }

  return (
    <View style={styles.section} testID="offer-reviews">
      <ThemedText type="smallBold">{t('offer.reviews')}</ThemedText>

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
      {/* Plus d'avis que ceux affichés : la liste complète (décision 2026-11-19-nuit-tous-les-avis). */}
      {reviews.count > reviews.latest.length && (
        <Pressable
          testID="offer-reviews-all"
          accessibilityRole="link"
          hitSlop={Spacing.two}
          onPress={() => router.push({ pathname: '/offers/[id]/reviews', params: { id: offerId } })}>
          <ThemedText type="linkPrimary">{t('offer.allReviews', { count: String(reviews.count) })}</ThemedText>
        </Pressable>
      )}

      {user === null ? (
        <ThemedText type="small" themeColor="textSecondary" testID="offer-reviews-sign-in">
          {t('offer.signInToReview')}
        </ThemedText>
      ) : (
        reviews.can_review && (
          <View style={styles.actions}>
            <Pressable
              testID="offer-review-write"
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/offers/[id]/review', params: { id: offerId } })}
              style={({ pressed }) => [styles.button, { borderColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {reviews.mine ? t('offer.editReview') : t('offer.writeReview')}
              </ThemedText>
            </Pressable>
            {removal !== null && reviews.delete && (
              <Pressable testID="offer-review-delete" accessibilityRole="button" hitSlop={Spacing.two} onPress={confirmRemove}>
                <ThemedText type="small" style={styles.error}>
                  {reviews.delete.label}
                </ThemedText>
              </Pressable>
            )}
          </View>
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
  section: { gap: Spacing.two, marginTop: Spacing.three },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  review: { gap: Spacing.half, paddingVertical: Spacing.two, borderBottomWidth: 1 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  actions: { gap: Spacing.three, alignItems: 'center', marginTop: Spacing.one },
  button: { alignSelf: 'stretch', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: Spacing.three },
  pressed: { opacity: 0.6 },
  error: { color: ERROR_COLOR },
});
