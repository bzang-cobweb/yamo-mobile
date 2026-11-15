import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/** Case à cocher unique (ex. accepter les conditions) : le libellé est à côté de la case. */
export function CheckboxField({ field, value, onChange, error, disabled }: FieldProps<boolean>) {
  const theme = useTheme();

  return (
    <FieldShell field={{ ...field, label: null }} error={error}>
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="checkbox"
        accessibilityLabel={field.label ?? field.name}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onChange(!value)}
        style={styles.row}>
        <View style={[styles.box, { borderColor: theme.text }, value && { backgroundColor: theme.text }]}>
          {value && <ThemedText style={[styles.check, { color: theme.background }]}>✓</ThemedText>}
        </View>
        <ThemedText>
          {field.label}
          {field.required && <ThemedText style={styles.required}> *</ThemedText>}
        </ThemedText>
      </Pressable>
      {field.help !== null && !error && (
        <ThemedText type="small" themeColor="textSecondary">
          {field.help}
        </ThemedText>
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 12, lineHeight: 14, fontWeight: 700 },
  required: { color: '#d93025' },
});
