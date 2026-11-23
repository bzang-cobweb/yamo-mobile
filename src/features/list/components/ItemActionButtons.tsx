import { Pressable, StyleSheet, View } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { ListItemAction } from '../types';

/**
 * Les boutons d'une carte (décision 2026-11-19-contrat-reservations-logements-profil),
 * à droite sous son contenu : `primary` plein, `destructive` en rouge, sinon bordé.
 * Le même rendu dans une liste et dans le panneau d'un jour du calendrier ; avec `fullWidth`, toute la largeur de la
 * carte, partagée à parts égales (deux par ligne : « Accepter » et « Refuser » dans le calendrier, décision
 * 2026-11-22-calendrier-deux-boutons-par-ligne).
 */
export function ItemActionButtons({ actions, testID, onPress, fullWidth = false }: { actions: ListItemAction[]; testID: string; onPress: (action: ListItemAction) => void; fullWidth?: boolean }) {
  const theme = useTheme();

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={fullWidth ? styles.column : styles.actions} testID={`${testID}-buttons`}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          testID={`${testID}-${action.style}`}
          accessibilityRole="button"
          onPress={() => onPress(action)}
          style={({ pressed }) => [
            styles.action,
            fullWidth && styles.full,
            action.style === 'primary' ? { backgroundColor: theme.primary } : { borderColor: action.style === 'destructive' ? ERROR_COLOR : theme.backgroundSelected, borderWidth: 1 },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: action.style === 'primary' ? theme.onPrimary : action.style === 'destructive' ? ERROR_COLOR : theme.text }}>
            {action.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  action: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 8 },
  // Toute la largeur, partagée à parts égales, deux par ligne ; plus d'espace au-dessus, sous la date (décisions
  // 2026-11-22-calendrier-espace-boutons et 2026-11-22-calendrier-deux-boutons-par-ligne).
  // Le premier (« Accepter ») à droite (décision 2026-11-22-calendrier-premier-bouton-a-droite).
  column: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  full: { flexGrow: 1, flexBasis: '40%', alignItems: 'center' },
  pressed: { opacity: 0.6 },
});
