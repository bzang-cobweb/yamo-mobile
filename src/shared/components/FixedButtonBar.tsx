import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/**
 * Un bouton principal dans une barre fixe en bas de l'écran, au-dessus de la marge
 * du bas : « Ajouter un logement » dans une liste, « Traiter la demande » sur la
 * page d'une notification. L'écran place la barre après son contenu qui défile.
 */
export function FixedButtonBar({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[styles.bar, { borderTopColor: theme.backgroundSelected, backgroundColor: theme.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <Pressable
        testID={`${testID}-button`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
          {label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.four },
  button: { alignItems: 'center', paddingVertical: Spacing.three, borderRadius: 12 },
  pressed: { opacity: 0.6 },
});
