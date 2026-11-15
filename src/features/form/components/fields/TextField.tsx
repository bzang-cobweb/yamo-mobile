import { TextInput, type TextInputProps } from 'react-native';

import type { FieldProps, FieldType } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/** Ce qui distingue `text`, `email` et `password` : clavier, saisie masquée, remplissage automatique. */
const VARIANTS: Partial<Record<FieldType, TextInputProps>> = {
  text: {},
  email: { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email', textContentType: 'emailAddress' },
  password: { secureTextEntry: true, autoCapitalize: 'none', autoComplete: 'password', textContentType: 'password' },
};

/**
 * Champ texte : sert les types `text`, `email`, `password` et `hidden`
 * (décision 2026-11-15-contrat-mobile-features-formulaires). Un champ `hidden`
 * garde sa valeur et l'envoie, sans rien afficher.
 */
export function TextField({ field, value, onChange, error, disabled, onSubmitEditing }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));

  if (field.type === 'hidden') {
    return null;
  }

  return (
    <FieldShell field={field} error={error}>
      <TextInput
        testID={`field-${field.name}`}
        accessibilityLabel={field.label ?? field.name}
        style={inputStyle}
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder ?? undefined}
        editable={!disabled}
        onSubmitEditing={onSubmitEditing}
        {...VARIANTS[field.type]}
      />
    </FieldShell>
  );
}
