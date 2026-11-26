import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/**
 * La barre fixe du bas d'un panneau (décision 2026-11-26-sheet-bar) : bordée en haut, sur le fond du thème, placée par le
 * contenu après ce qui défile. `row` : ses éléments sur une ligne, aux deux bouts (« Effacer les filtres » /
 * « Appliquer les filtres ») ; sinon en colonne (la note d'un jour du calendrier, puis son action).
 */
export function SheetBar({ children, row = false, testID }: { children: ReactNode; row?: boolean; testID?: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.bar, row && styles.row, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background }]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
