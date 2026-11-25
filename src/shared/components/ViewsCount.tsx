import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/** Les vues, servies par l'API : le nombre, et le libellé lu par les lecteurs d'écran (« 12 vues »). */
export type Views = { count: number; label: string };

/**
 * Un œil suivi du nombre de vues, en gris (décision 2026-11-25-vues-oeil) ; les lecteurs d'écran lisent « 12 vues ».
 * `compact` : plus petit, sur les cartes à image de côté (« Mes partenaires », décision 2026-11-25-vues-cartes-partenaires).
 */
export function ViewsCount({ views, testID, style, compact = false }: { views: Views; testID?: string; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  const theme = useTheme();

  // Une réponse d'une autre forme (une ancienne réponse gardée en cache, qui donnait « 12 vues ») : rien plutôt qu'une erreur.
  if (typeof views !== 'object' || views === null || typeof views.count !== 'number') {
    return null;
  }

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={views.label} testID={testID}>
      <SymbolView name={{ ios: 'eye', android: 'visibility', web: 'visibility' }} tintColor={theme.textSecondary} size={compact ? 13 : 16} />
      <ThemedText type="small" themeColor="textSecondary" style={compact && styles.compact} testID={testID ? `${testID}-count` : undefined}>
        {views.count.toLocaleString()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  compact: { fontSize: 12, lineHeight: 16 },
});
