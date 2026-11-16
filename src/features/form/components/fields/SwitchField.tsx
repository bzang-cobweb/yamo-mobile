import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';

/** Interrupteur oui / non, libellé à gauche. */
export function SwitchField({ field, value, onChange, error, disabled }: FieldProps<boolean>) {
  return (
    <FieldShell field={{ ...field, label: null }} error={error}>
      <View style={styles.row}>
        <ThemedText style={styles.label}>
          {field.label}
          {field.required && <ThemedText style={styles.required}> *</ThemedText>}
        </ThemedText>
        <Switch
          testID={`field-${field.name}`}
          accessibilityLabel={field.label ?? field.name}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
        />
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  label: { flex: 1 },
  required: { color: '#d93025' },
});
