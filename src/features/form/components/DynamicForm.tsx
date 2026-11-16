import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import type { FieldValue, FormDefinition, FormErrors, FormValues } from '../types';
import { fieldError, initialValues } from '../utils/values';
import { ERROR_COLOR } from './FieldShell';
import { FormField } from './FormField';

type DynamicFormProps = {
  definition: FormDefinition;
  /** Envoie les valeurs ; une `ApiError` 422 est affichée sous les champs concernés. */
  onSubmit: (values: FormValues) => Promise<void>;
};

/**
 * Affiche un formulaire décrit par l'API : un composant par champ, valeurs
 * saisies, bouton d'envoi. Il ne valide rien lui-même : les erreurs viennent
 * de l'API, qui applique les règles déclarées avec le formulaire.
 *
 * Pour repartir des valeurs par défaut (autre formulaire, autre langue), le
 * monter avec une `key` différente.
 */
export function DynamicForm({ definition, onSubmit }: DynamicFormProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<FormValues>(() => initialValues(definition));
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function change(name: string, value: FieldValue) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  async function submit() {
    setSubmitting(true);
    setErrors({});
    setMessage(null);

    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldNames = definition.fields.map((field) => field.name);
        setErrors(error.errors);
        // Erreur qui ne vise aucun champ affiché (trop d'essais, champ ajouté par l'app…) : message général.
        const onFields = Object.keys(error.errors).some((key) => fieldNames.includes(key.split('.')[0]));
        setMessage(onFields ? null : (Object.values(error.errors)[0]?.[0] ?? error.message));
      } else if (error instanceof NetworkError) {
        setMessage(t('offline.message'));
      } else {
        setMessage(t('error.unknown'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.form} testID={`form-${definition.name}`}>
      {(definition.title !== null || definition.subtitle !== null) && (
        <View style={styles.header}>
          {definition.title !== null && (
            <ThemedText type="subtitle" accessibilityRole="header" testID="form-title">
              {definition.title}
            </ThemedText>
          )}
          {definition.subtitle !== null && (
            <ThemedText themeColor="textSecondary" testID="form-subtitle">
              {definition.subtitle}
            </ThemedText>
          )}
        </View>
      )}

      {definition.fields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(value) => change(field.name, value)}
          error={fieldError(errors, field.name)}
          disabled={submitting}
          onSubmitEditing={submit}
        />
      ))}

      {message && (
        <ThemedText type="small" style={styles.message} accessibilityRole="alert" testID="form-message">
          {message}
        </ThemedText>
      )}

      <Pressable
        testID="form-submit"
        accessibilityRole="button"
        onPress={submit}
        disabled={submitting}
        style={({ pressed }) => [styles.button, submitting && styles.disabled, pressed && styles.pressed]}>
        {submitting && <ActivityIndicator color="#fff" />}
        <ThemedText style={styles.buttonText}>{submitting ? t('form.submitting') : definition.submit.label}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  header: { gap: Spacing.one },
  message: { color: ERROR_COLOR },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: Spacing.three,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  buttonText: { color: '#fff' },
});
