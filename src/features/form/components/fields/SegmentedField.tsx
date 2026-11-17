import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/**
 * Choix parmi quelques options, en boutons côte à côte, une seule active
 * (ex. « E-mail | Téléphone » pour l'identifiant de connexion).
 */
export function SegmentedField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const theme = useTheme();

  return (
    <FieldShell field={field} error={error}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={field.label ?? field.name}
        style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
        {field.options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              testID={`field-${field.name}-option-${option.value}`}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[styles.segment, selected && { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={selected ? { color: theme.onPrimary } : undefined}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderRadius: 8, padding: Spacing.half },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: 6 },
});
