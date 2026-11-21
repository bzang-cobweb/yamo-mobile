import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Secondary = { label: string; onPress: () => void };

/**
 * Un bouton principal dans une barre fixe en bas de l'écran, au-dessus de la marge
 * du bas : « Ajouter un logement » dans une liste, « Traiter la demande » sur la
 * page d'une notification. L'écran place la barre après son contenu qui défile.
 * `secondary` : un second bouton à sa gauche, bordé de rouge (« Annuler », décision
 * 2026-11-21-annuler-depuis-le-detail) ; les deux se partagent la largeur.
 */
export function FixedButtonBar({ label, onPress, testID, secondary }: { label: string; onPress: () => void; testID: string; secondary?: Secondary | null }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[styles.bar, secondary && styles.row, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      {secondary && (
        <Pressable
          testID={`${testID}-secondary`}
          accessibilityRole="button"
          onPress={secondary.onPress}
          style={({ pressed }) => [styles.button, styles.half, styles.secondary, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.secondaryText}>
            {secondary.label}
          </ThemedText>
        </Pressable>
      )}
      <Pressable
        testID={`${testID}-button`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.button, secondary && styles.half, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
          {label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.four },
  // Deux boutons côte à côte.
  row: { flexDirection: 'row', gap: Spacing.three },
  button: { alignItems: 'center', paddingVertical: Spacing.three, borderRadius: 12 },
  half: { flex: 1 },
  secondary: { borderWidth: 1, borderColor: ERROR_COLOR },
  secondaryText: { color: ERROR_COLOR },
  pressed: { opacity: 0.6 },
});
