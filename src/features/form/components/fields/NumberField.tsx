import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Nombre : clavier numérique ; la valeur reste du texte, validée par l'API. Une
 * unité servie par l'API (`suffix`, « m² ») s'affiche après la saisie.
 */
export function NumberField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));

  return (
    <FieldShell field={field} error={error}>
      <View style={styles.row}>
        <TextInput
          testID={`field-${field.name}`}
          accessibilityLabel={field.suffix ? `${field.label ?? field.name} (${field.suffix})` : (field.label ?? field.name)}
          style={[inputStyle, styles.input]}
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder ?? undefined}
          keyboardType="decimal-pad"
          editable={!disabled}
        />
        {field.suffix && (
          <ThemedText themeColor="textSecondary" testID={`field-${field.name}-suffix`}>
            {field.suffix}
          </ThemedText>
        )}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  input: { flex: 1 },
});
