import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Props = { href: Href; label: string; testID: string };

/** Ligne du profil qui ouvre un de ses formulaires. */
export function ProfileMenuLink({ href, label, testID }: Props) {
  const theme = useTheme();

  return (
    // Pas de `Link asChild` : il ne transmet pas le style calculé de `Pressable`.
    <Pressable
      testID={testID}
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={16}
        tintColor={theme.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 8,
  },
  label: { flex: 1 },
  pressed: { opacity: 0.7 },
});
