import { StyleSheet, TextInput } from 'react-native';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/** Texte sur plusieurs lignes. */
export function TextareaField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));

  return (
    <FieldShell field={field} error={error}>
      <TextInput
        testID={`field-${field.name}`}
        accessibilityLabel={field.label ?? field.name}
        style={[inputStyle, styles.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder ?? undefined}
        multiline
        textAlignVertical="top"
        editable={!disabled}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  textarea: { minHeight: 96 },
});
