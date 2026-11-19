import { Pressable, StyleSheet, View } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { ListItemAction } from '../types';

/**
 * Les boutons d'une carte (décision 2026-11-19-contrat-reservations-logements-profil),
 * à droite sous son contenu : `primary` plein, `destructive` en rouge, sinon bordé.
 * Le même rendu dans une liste et dans le panneau d'un jour du calendrier.
 */
export function ItemActionButtons({ actions, testID, onPress }: { actions: ListItemAction[]; testID: string; onPress: (action: ListItemAction) => void }) {
  const theme = useTheme();

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.actions}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          testID={`${testID}-${action.style}`}
          accessibilityRole="button"
          onPress={() => onPress(action)}
          style={({ pressed }) => [
            styles.action,
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
  pressed: { opacity: 0.6 },
});
