import { StyleSheet, View } from 'react-native';

import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { ListItem } from '../types';

/**
 * Sous le sous-titre d'un item (décision 2026-11-19-contrat-avis-offres) : la note
 * moyenne (« ★★★★★ 4,5 (12) »), puis la phrase mise en avant (le dernier avis),
 * en gras, sur sa ligne, sur deux lignes au plus. Rien de ce que l'API ne sert pas.
 */
export function ItemReviews({ item, testID }: { item: Pick<ListItem, 'rating' | 'highlight'>; testID?: string }) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const { rating, highlight } = item;

  if (!rating && !highlight) {
    return null;
  }

  const average = rating ? rating.average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '';

  return (
    <>
      {rating && (
        <View
          style={styles.rating}
          accessible
          accessibilityLabel={t('list.ratingSummary', { average, count: String(rating.count) })}
          testID={testID ? `${testID}-rating` : undefined}>
          <Stars value={rating.average} emptyColor={theme.backgroundSelected} />
          <ThemedText type="small" themeColor="textSecondary">
            {`${average} (${rating.count})`}
          </ThemedText>
        </View>
      )}
      {highlight && (
        <ThemedText type="smallBold" numberOfLines={2} testID={testID ? `${testID}-highlight` : undefined}>
          {highlight}
        </ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  rating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
