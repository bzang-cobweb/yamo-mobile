import { router, type Href } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Props = {
  href: Href;
  label: string;
  /** Le symbole devant le libellé (SF Symbols sur iOS, Material ailleurs), servi par l'API ; `null` : aucun. */
  icon?: { ios: string; android: string } | null;
  testID: string;
};

/** Ligne du profil qui ouvre un de ses formulaires, une liste ou un sous-menu ; son icône d'abord. */
export function ProfileMenuLink({ href, label, icon = null, testID }: Props) {
  const theme = useTheme();

  return (
    // Pas de `Link asChild` : il ne transmet pas le style calculé de `Pressable`.
    <Pressable
      testID={testID}
      accessibilityRole="link"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      {icon !== null && (
        <SymbolView
          testID={`${testID}-icon`}
          name={{ ios: icon.ios as SFSymbol, android: icon.android as never, web: icon.android as never }}
          size={20}
          tintColor={theme.text}
        />
      )}
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
