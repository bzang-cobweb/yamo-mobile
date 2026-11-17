import { StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';

import type { FieldProps } from '../../types';
import { FieldShell } from '../FieldShell';
import { useInputStyle } from './inputStyle';

/**
 * Texte sur plusieurs lignes. Avec un nombre maximal de caractères (`max_length`,
 * envoyé par l'API), la saisie s'arrête à la limite et un compteur « n / N » suit.
 */
export function TextareaField({ field, value, onChange, error, disabled }: FieldProps<string>) {
  const inputStyle = useInputStyle(Boolean(error));
  const maxLength = field.max_length ?? undefined;

  return (
    <FieldShell field={field} error={error}>
      <TextInput
        testID={`field-${field.name}`}
        accessibilityLabel={field.label ?? field.name}
        style={[inputStyle, styles.textarea]}
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder ?? undefined}
        maxLength={maxLength}
        multiline
        textAlignVertical="top"
        editable={!disabled}
      />
      {maxLength !== undefined && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.counter} testID={`field-${field.name}-counter`}>
          {`${(value ?? '').length} / ${maxLength}`}
        </ThemedText>
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  textarea: { minHeight: 96 },
  counter: { textAlign: 'right' },
});
