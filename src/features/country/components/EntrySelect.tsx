import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OptionsModal } from '@/features/form/components/fields/OptionsModal';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

type Option = { value: string; label: string };

/**
 * Sélecteur de l'écran d'entrée (décision 2026-11-18-ecran-entree-selecteurs) :
 * un champ qui montre le choix courant ; un appui ouvre la liste, avec recherche
 * si demandé. Une seule option : affichée, sans liste.
 */
export function EntrySelect({
  label,
  placeholder,
  options,
  selected,
  onSelect,
  searchable = false,
  testID,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string) => void;
  searchable?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === selected);
  const single = options.length === 1;

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${current?.label ?? placeholder}`}
        accessibilityState={{ disabled: single }}
        disabled={single}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
        <ThemedText style={styles.value} themeColor={current ? undefined : 'textSecondary'}>
          {current?.label ?? placeholder}
        </ThemedText>
        {!single && (
          <SymbolView name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }} size={14} tintColor={theme.textSecondary} />
        )}
      </Pressable>
      <OptionsModal
        visible={open}
        title={label}
        options={options}
        selected={selected ?? ''}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
        searchable={searchable}
        testIDPrefix={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  value: { flex: 1 },
  pressed: { opacity: 0.7 },
});
