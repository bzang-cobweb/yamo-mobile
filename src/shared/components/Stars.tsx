import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';

/**
 * Une note en étoiles, de 0 à 5 (décision 2026-11-19-contrat-avis-offres) : la
 * note arrondie à l'étoile près, en étoiles pleines, le reste en étoiles vides.
 * Décorative : l'écran qui l'affiche donne la note en texte à l'accessibilité. Les étoiles pleines ont la couleur des
 * titres (noir, blanc en mode sombre, décision 2026-11-26-etoiles-couleur-titre).
 */
export function Stars({ value, size = 14, emptyColor, style, testID }: { value: number; size?: number; emptyColor: string; style?: StyleProp<TextStyle>; testID?: string }) {
  const theme = useTheme();
  const full = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <Text style={[styles.stars, { fontSize: size, lineHeight: size * 1.3 }, style]} accessible={false} importantForAccessibility="no" testID={testID}>
      <Text style={{ color: theme.text }} testID={testID ? `${testID}-full` : undefined}>
        {'★'.repeat(full)}
      </Text>
      <Text style={{ color: emptyColor }}>{'★'.repeat(5 - full)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  stars: { letterSpacing: 1 },
});
