import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/** Boutons radio : une option parmi toutes, toutes visibles. */
export function RadioField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const theme = useTheme();

  return (
    <FieldShell field={field} error={error}>
      <View accessibilityRole="radiogroup" accessibilityLabel={field.label ?? field.name} style={styles.group}>
        {field.options.map((option) => {
          const checked = option.value === value;

          return (
            <Pressable
              key={option.value}
              testID={`field-${field.name}-option-${option.value}`}
              accessibilityRole="radio"
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={styles.row}>
              <View style={[styles.circle, { borderColor: theme.text }]}>
                {checked && <View style={[styles.dot, { backgroundColor: theme.text }]} />}
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
  circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
