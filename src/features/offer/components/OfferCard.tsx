import { router } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ItemPicture } from '@/features/list/components/ItemPicture';
import { ItemReviews } from '@/features/list/components/ItemReviews';
import type { ListItem } from '@/features/list/types';
import { CARD_BODY, CARD_GAP, CARD_PADDING } from '@/shared/components/List';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';

/** La taille des étoiles d'une carte réduite, celle de sa police. */
const COMPACT_STARS = 9;

type Props = {
  item: ListItem;
  /** Préfixe des `testID` : `browse-item`, `home-item`… */
  testIDPrefix: string;
  style?: StyleProp<ViewStyle>;
  /** Plus petite, sur l'accueil : une police réduite (décision 2026-11-23-accueil-deux-cartes). */
  compact?: boolean;
  /** Appelé au toucher, avant d'ouvrir la fiche (la région du carrousel de l'accueil, décision 2026-11-25-carte-choisit-region). */
  onOpen?: () => void;
};

/**
 * La carte d'une offre, la même dans la recherche et sur l'accueil (décision 2026-11-23-accueil-carrousels-par-ville) :
 * la photo et le cœur, le titre, le sous-titre, puis la note. Toucher la carte ouvre la fiche de l'offre (décision
 * 2026-11-18-fiche-offre) ; c'est la fiche qui compte le clic (décision 2026-11-25-clic-a-l-ouverture).
 */
export function OfferCard({ item, testIDPrefix, style, compact = false, onOpen }: Props) {
  const theme = useTheme();
  const testID = `${testIDPrefix}-${item.id}`;
  const text = compact ? styles.compactText : undefined;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="link"
      onPress={() => {
        onOpen?.();
        router.push({ pathname: '/offers/[id]', params: { id: item.id } });
      }}
      style={({ pressed }) => [styles.card, { borderColor: theme.backgroundSelected }, style, pressed && styles.pressed]}>
      {/* La photo au-dessus du titre ; sans photo, un emplacement neutre ; le cœur d'un membre connecté. */}
      <ItemPicture item={item} placeholder testID={testID} />
      {/* Sous la photo, une zone en retrait (décision 2026-11-22-cartes-espace-sous-photo). */}
      {/* Sur l'accueil, sans retrait : le texte a la largeur de la photo (décision 2026-11-23-accueil-texte-sans-retrait). */}
      <View style={[CARD_BODY, compact && styles.compactBody]} testID={`${testID}-body`}>
        <ThemedText type="smallBold" style={text}>
          {item.title}
        </ThemedText>
        {item.subtitle && (
          <ThemedText type="small" themeColor="textSecondary" style={text}>
            {item.subtitle}
          </ThemedText>
        )}
        {/* La note sur sa ligne, sous le prix, à droite (décisions 2026-11-19-contrat-avis-offres et
            2026-11-21-accueil-note-sous-le-prix). */}
        <ItemReviews item={item} testID={testID} textStyle={text} starSize={compact ? COMPACT_STARS : undefined} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Sans fond, une bordure (décision 2026-11-18-liste-bordure).
  card: { borderRadius: 8, borderWidth: 1, padding: CARD_PADDING, gap: CARD_GAP },
  pressed: { opacity: 0.7 },
  // Plus petite sur l'accueil (décisions 2026-11-23-accueil-deux-cartes et 2026-11-25-cartes-accueil-plus-petites).
  compactText: { fontSize: 10, lineHeight: 14 },
  compactBody: { paddingHorizontal: 0 },
});
