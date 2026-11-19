import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NetworkError } from '@/shared/api/errors';
import { BackHeader } from '@/shared/components/BackHeader';
import { List } from '@/shared/components/List';
import { useI18n } from '@/shared/i18n/I18nContext';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';

import { ReviewRow } from '../components/OfferReviews';
import { useOfferReviews } from '../hooks/useOfferReviews';

/**
 * Tous les avis d'une offre (décision 2026-11-19-nuit-tous-les-avis) : du plus
 * récent au plus ancien, chargés par pages en faisant défiler. Même forme d'avis
 * que sur la fiche.
 */
export function OfferReviewsScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const query = useOfferReviews(id);
  const reviews = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={t('offer.reviews')} />
          {query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator testID="offer-reviews-loading" />
            </View>
          ) : query.isError ? (
            <View style={styles.center}>
              <ThemedText style={styles.error} accessibilityRole="alert" testID="offer-reviews-error">
                {query.error instanceof NetworkError ? t('offline.message') : t('error.unknown')}
              </ThemedText>
              <Pressable accessibilityRole="button" testID="offer-reviews-retry" onPress={() => query.refetch()}>
                <ThemedText type="linkPrimary">{t('form.retry')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.body, { maxWidth: MaxContentWidth / 2 }]}>
              <List
                testID="offer-reviews-list"
                items={reviews}
                keyExtractor={(review) => review.id}
                renderItem={(review) => <ReviewRow review={review} />}
                hasMore={query.hasNextPage}
                onLoadMore={() => query.fetchNextPage()}
                loadingMore={query.isFetchingNextPage}
                loadingMoreLabel={t('list.loading')}
                empty={t('offer.noReviews')}
              />
            </View>
          )}
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.four },
  center: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  error: { color: ERROR_COLOR },
});
