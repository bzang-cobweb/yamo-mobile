import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/** Lien des filtres : son libellé, le nombre de filtres actifs (badge) et son action. */
export type ListFilter = {
  label: string;
  count: number;
  onPress: () => void;
};

/**
 * Le lien « Filtres », aligné à droite, avec le nombre de filtres actifs en pastille
 * (décision 2026-11-19-contrat-filtres-vitrine) : le même dans les listes et dans
 * les notifications.
 */
export function FilterLink({ filter, testID }: { filter: ListFilter; testID: string }) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={filter.count > 0 ? `${filter.label} (${filter.count})` : filter.label}
      hitSlop={Spacing.two}
      onPress={filter.onPress}
      style={({ pressed }) => [styles.filter, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' }} size={16} tintColor={theme.primary} />
      <ThemedText type="linkPrimary">{filter.label}</ThemedText>
      {filter.count > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.primary }]} testID={`${testID}-badge`}>
          <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
            {filter.count}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filter: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: Spacing.one, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
