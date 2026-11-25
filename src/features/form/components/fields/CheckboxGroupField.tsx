import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/** La hauteur au plus d'une liste de cases ; au-delà, elle défile dans son cadre (décision 2026-11-25-cases-hauteur-fixe). */
export const CHECKBOX_GROUP_MAX_HEIGHT = 260;

/**
 * Cases multiples : plusieurs options parmi toutes ; la valeur est la liste des options cochées. Une longue liste
 * (les équipements) garde une hauteur fixe et défile dans un cadre (décision 2026-11-25-cases-hauteur-fixe).
 */
export function CheckboxGroupField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const theme = useTheme();

  function toggle(optionValue: string) {
    onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
  }

  return (
    <FieldShell field={field} error={error}>
      <ScrollView
        accessibilityLabel={field.label ?? field.name}
        style={[styles.frame, { borderColor: theme.backgroundSelected }]}
        contentContainerStyle={styles.group}
        nestedScrollEnabled
        persistentScrollbar
        keyboardShouldPersistTaps="handled"
        testID={`field-${field.name}-list`}>
        {field.options.map((option) => {
          const checked = value.includes(option.value);

          return (
            <Pressable
              key={option.value}
              testID={`field-${field.name}-option-${option.value}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => toggle(option.value)}
              style={styles.row}>
              <View style={[styles.box, { borderColor: theme.text }, checked && { backgroundColor: theme.text }]}>
                {checked && <ThemedText style={[styles.check, { color: theme.background }]}>✓</ThemedText>}
              </View>
              <ThemedText>{option.label}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  frame: { maxHeight: CHECKBOX_GROUP_MAX_HEIGHT, borderWidth: 1, borderRadius: 8, flexGrow: 0 },
  group: { gap: Spacing.two, padding: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 12, lineHeight: 14, fontWeight: 700 },
});
