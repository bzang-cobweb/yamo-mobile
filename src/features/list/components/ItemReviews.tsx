import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

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
export function ItemReviews({
  item,
  testID,
  textStyle,
  starSize,
  trailing,
  onRatingPress,
}: {
  item: Pick<ListItem, 'rating' | 'highlight'>;
  testID?: string;
  textStyle?: StyleProp<TextStyle>;
  /** La taille des étoiles, plus petite sur une carte réduite (décision 2026-11-23-accueil-deux-cartes). */
  starSize?: number;
  /** À droite des étoiles, sur leur ligne : l'œil « Voir » de « Mes réservations » (décision 2026-11-27-reservations-oeil-voir). */
  trailing?: ReactNode;
  /** Toucher les étoiles : leurs avis dans un panneau (« Mes réservations », décision 2026-11-27-reservations-oeil-voir). */
  onRatingPress?: () => void;
}) {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const { rating, highlight } = item;

  if (!rating && !highlight && !trailing) {
    return null;
  }

  const average = rating ? rating.average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '';

  return (
    <View style={styles.column} testID={testID ? `${testID}-reviews` : undefined}>
      {highlight && (
        <ThemedText type="smallBold" numberOfLines={2} style={textStyle} testID={testID ? `${testID}-highlight` : undefined}>
          {highlight}
        </ThemedText>
      )}
      {(rating || trailing) && (
        <View style={styles.starsRow} testID={testID ? `${testID}-stars-row` : undefined}>
          {rating && (
            <Pressable
              accessible
              accessibilityRole={onRatingPress ? 'button' : undefined}
              accessibilityLabel={t('list.ratingSummary', { average, count: String(rating.count) })}
              disabled={!onRatingPress}
              hitSlop={Spacing.one}
              onPress={onRatingPress}
              style={({ pressed }) => pressed && styles.pressed}
              testID={testID ? `${testID}-rating` : undefined}>
              <Stars value={rating.average} emptyColor={theme.backgroundSelected} size={starSize} />
            </Pressable>
          )}
          {trailing}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: Spacing.half },
  // Sur sa ligne, à droite ; ce qui suit les étoiles, à leur droite.
  starsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two },
  pressed: { opacity: 0.6 },
});
