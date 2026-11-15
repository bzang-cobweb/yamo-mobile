import { TextInput } from 'react-native';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/** Nombre : clavier numérique ; la valeur reste du texte, validée par l'API. */
export function NumberField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));

  return (
    <FieldShell field={field} error={error}>
      <TextInput
        testID={`field-${field.name}`}
        accessibilityLabel={field.label ?? field.name}
        style={inputStyle}
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder ?? undefined}
        keyboardType="decimal-pad"
        editable={!disabled}
      />
    </FieldShell>
  );
}
