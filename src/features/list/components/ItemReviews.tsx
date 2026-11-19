import { StyleSheet, View } from 'react-native';

import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { ListItem } from '../types';

/**
 * Bas d'un item (décision 2026-11-19-acces-avis-backoffice) : la phrase mise en
 * avant, en gras, sur deux lignes au plus ; puis, en
 * bas à droite, les étoiles de la note moyenne, seules (la note et le nombre
 * d'avis sont lus par l'accessibilité). Rien de ce que l'API ne sert pas.
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
    <View style={styles.row}>
      {highlight ? (
        <ThemedText type="smallBold" numberOfLines={2} style={styles.highlight} testID={testID ? `${testID}-highlight` : undefined}>
          {highlight}
        </ThemedText>
      ) : (
        <View style={styles.highlight} />
      )}
      {rating && (
        <View
          accessible
          accessibilityLabel={t('list.ratingSummary', { average, count: String(rating.count) })}
          testID={testID ? `${testID}-rating` : undefined}>
          <Stars value={rating.average} emptyColor={theme.backgroundSelected} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  highlight: { flex: 1 },
});
