import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/** Cases multiples : plusieurs options parmi toutes ; la valeur est la liste des options cochées. */
export function CheckboxGroupField({ field, value, onChange, error, disabled }: FieldProps<string[]>) {
  const theme = useTheme();

  function toggle(optionValue: string) {
    onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
  }

  return (
    <FieldShell field={field} error={error}>
      <View accessibilityLabel={field.label ?? field.name} style={styles.group}>
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
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 12, lineHeight: 14, fontWeight: 700 },
});
