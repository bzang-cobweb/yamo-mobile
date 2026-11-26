import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/**
 * Choix multiples en puces, sur une ligne qui défile (décision 2026-11-26-filtres-en-puces) : chaque option est
 * une puce bordée aux coins arrondis ; un appui la choisit ou la retire. Choisie, elle passe en fond noir, texte
 * blanc (les couleurs du texte et du fond du thème, inversées). La valeur est la liste des options choisies.
 */
export function ChipsField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const theme = useTheme();

  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <FieldShell field={field} error={error}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
        accessibilityLabel={field.label ?? field.name}
        testID={`field-${field.name}-chips`}>
        {field.options.map((option) => {
          const selected = value.includes(option.value);

          return (
            <Pressable
              key={option.value}
              testID={`field-${field.name}-option-${option.value}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => toggle(option.value)}
              style={[
                styles.chip,
                { borderColor: selected ? theme.text : theme.backgroundSelected },
                selected && { backgroundColor: theme.text },
              ]}>
              <ThemedText type="small" style={selected ? { color: theme.background } : undefined}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
