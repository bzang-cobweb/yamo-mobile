import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OptionsModal } from '@/features/form/components/fields/OptionsModal';
import type { FormFieldDefinition } from '@/features/form/types';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { SEARCH_HEIGHT } from '@/shared/components/List';
import { Spacing } from '@/shared/theme/theme';

/** L'épingle d'une région, sur la carte et devant chaque région de la liste. */
const PIN = { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' } as const;

/**
 * Le sélecteur de région en tête de la recherche (décision 2026-11-25-region-en-tete-recherche) : une carte sur toute
 * la largeur, une épingle, le nom des régions du pays en petit (« Région », « Canton »…), la région choisie en gras et
 * une flèche ; un appui ouvre la liste des régions, avec recherche, sans « Tous ».
 */
export function RegionSelector({ field, value, onChange }: { field: FormFieldDefinition; value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = field.options.find((option) => option.value === value) ?? null;

  return (
    <View testID="browse-region">
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="button"
        accessibilityLabel={field.label ?? field.name}
        accessibilityValue={{ text: selected?.label }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
        <View style={[styles.pin, { backgroundColor: theme.background }]}>
          <SymbolView name={PIN} tintColor={theme.primary} size={20} />
        </View>
        <View style={styles.texts}>
          <ThemedText type="small" themeColor="textSecondary" testID="browse-region-label">
            {field.label}
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1} testID="browse-region-value">
            {selected?.label ?? ''}
          </ThemedText>
        </View>
        <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} tintColor={theme.textSecondary} size={16} />
      </Pressable>
      <OptionsModal
        visible={open}
        title={field.label}
        options={field.options}
        selected={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
        testIDPrefix={`field-${field.name}`}
        searchable
        // L'épingle devant chaque région (décision 2026-11-25-region-icone).
        icon={PIN}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: SEARCH_HEIGHT + Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  },
  pin: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
