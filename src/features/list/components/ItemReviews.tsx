import { StyleSheet, View } from 'react-native';

import { Stars } from '@/shared/components/Stars';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { ListItem } from '../types';

/**
 * Bas d'un item (décision 2026-11-19-acces-avis-backoffice) : la phrase mise en avant (le prix), en gras, sur
 * deux lignes au plus ; puis, sur sa propre ligne, alignées à droite, les étoiles de la note moyenne, seules (la
 * note et le nombre d'avis sont lus par l'accessibilité), sur toutes les cartes (décision
 * 2026-11-21-accueil-note-sous-le-prix). Rien de ce que l'API ne sert pas.
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
    <View style={styles.column} testID={testID ? `${testID}-reviews` : undefined}>
      {highlight && (
        <ThemedText type="smallBold" numberOfLines={2} testID={testID ? `${testID}-highlight` : undefined}>
          {highlight}
        </ThemedText>
      )}
      {rating && (
        <View
          accessible
          accessibilityLabel={t('list.ratingSummary', { average, count: String(rating.count) })}
          style={styles.stars}
          testID={testID ? `${testID}-rating` : undefined}>
          <Stars value={rating.average} emptyColor={theme.backgroundSelected} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: Spacing.half },
  // Sur sa ligne, à droite.
  stars: { alignSelf: 'flex-end' },
});
