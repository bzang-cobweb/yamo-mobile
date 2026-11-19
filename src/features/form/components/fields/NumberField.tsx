import { TextInput } from 'react-native';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Nombre : clavier numérique ; la valeur reste du texte, validée par l'API. Son
 * unité (`suffix`, « m² ») se lit dans l'aide, sous le champ (`FieldShell`), et
 * est donnée avec le libellé à l'accessibilité.
 */
export function NumberField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));

  return (
    <FieldShell field={field} error={error}>
      <TextInput
          testID={`field-${field.name}`}
          accessibilityLabel={field.suffix ? `${field.label ?? field.name} (${field.suffix})` : (field.label ?? field.name)}
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
