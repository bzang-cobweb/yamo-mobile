import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';

const STARS = '★★★★★';

/**
 * Une note en étoiles, de 0 à 5 (décision 2026-11-19-contrat-avis-offres), remplies au dixième (décision
 * 2026-11-27-note-au-dixieme) : cinq étoiles vides, recouvertes de cinq étoiles pleines coupées à la note (3,2 : trois
 * étoiles et un cinquième de la quatrième). Décorative : l'écran qui l'affiche donne la note en texte à
 * l'accessibilité. Les étoiles pleines ont la couleur des titres (noir, blanc en mode sombre, décision
 * 2026-11-26-etoiles-couleur-titre).
 */
export function Stars({ value, size = 14, emptyColor, style, testID }: { value: number; size?: number; emptyColor: string; style?: StyleProp<TextStyle>; testID?: string }) {
  const theme = useTheme();
  // La largeur des cinq étoiles, mesurée : les pleines sont coupées à la part de la note.
  const [width, setWidth] = useState(0);
  const ratio = Math.max(0, Math.min(5, value)) / 5;
  const text = [styles.stars, { fontSize: size, lineHeight: size * 1.3 }, style];

  return (
    <View style={styles.row} accessible={false} testID={testID}>
      <Text accessible={false} importantForAccessibility="no" style={[text, { color: emptyColor }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {STARS}
      </Text>
      <View pointerEvents="none" style={[styles.full, { width: width * ratio }]}>
        <Text accessible={false} importantForAccessibility="no" numberOfLines={1} ellipsizeMode="clip" style={[text, { color: theme.text, width }]} testID={testID ? `${testID}-full` : undefined}>
          {STARS}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignSelf: 'flex-start' },
  full: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  stars: { letterSpacing: 1 },
});
