import { TextInput } from 'react-native';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Code de vérification à 6 chiffres : clavier numérique et, sur iOS, proposition
 * automatique du code reçu par SMS (`oneTimeCode`).
 */
export function CodeField({ field, value, onChange, error, disabled, onSubmitEditing }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error), Boolean(field.readonly));

  return (
    <FieldShell field={field} error={error}>
      <TextInput
        testID={`field-${field.name}`}
        accessibilityLabel={field.label ?? field.name}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        onSubmitEditing={onSubmitEditing}
        style={[inputStyle, { fontSize: 24, letterSpacing: 8, textAlign: 'center' }]}
      />
    </FieldShell>
  );
}
