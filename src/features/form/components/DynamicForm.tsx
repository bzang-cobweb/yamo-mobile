import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { useBackStep } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { formService } from '../services/FormService';
import type { FieldValue, FormDefinition, FormErrors, FormFieldDefinition, FormValues } from '../types';
import { countryKey, fieldError, initialValues, isVisible, submittedValues } from '../utils/values';
import { ERROR_COLOR } from './FieldShell';
import { FormField } from './FormField';

type DynamicFormProps = {
  definition: FormDefinition;
  /** Envoie les valeurs ; une `ApiError` 422 est affichée sous les champs concernés. */
  onSubmit: (values: FormValues) => Promise<void>;
  /** Le titre est affiché par l'en-tête de l'écran : le formulaire ne le répète pas. */
  hideTitle?: boolean;
};

/**
 * Affiche un formulaire décrit par l'API : un composant par champ, valeurs
 * saisies, bouton d'envoi. Il ne valide rien lui-même : les erreurs viennent
 * de l'API, qui applique les règles déclarées avec le formulaire.
 *
 * Formulaire à étapes (`steps`) : une étape à la fois, « Étape 2 sur 3 ». « Suivant »
 * fait valider l'étape par l'API avant d'afficher la suivante ; à la dernière étape,
 * le bouton d'envoi envoie tout. Le retour à l'étape précédente, sans rien perdre, est
 * la flèche de l'en-tête de l'écran ; sans en-tête, un lien « Précédent ».
 *
 * Une action irréversible (`submit.destructive`, supprimer son compte…) a un
 * bouton d'envoi rouge.
 *
 * Pour repartir des valeurs par défaut (autre formulaire, autre langue), le
 * monter avec une `key` différente.
 */
export function DynamicForm({ definition, onSubmit, hideTitle = false }: DynamicFormProps) {
  const destructive = definition.submit.destructive === true;
  const { t } = useI18n();
  const theme = useTheme();
  const [values, setValues] = useState<FormValues>(() => initialValues(definition));
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const steps = definition.steps ?? [];
  const [step, setStep] = useState(0);
  const isLastStep = steps.length === 0 || step === steps.length - 1;
  const currentStep = steps[step];
  const visibleFields = (
    currentStep ? definition.fields.filter((field) => currentStep.fields.includes(field.name)) : definition.fields
  ).filter((field) => isVisible(field, values));

  function previousStep() {
    setErrors({});
    setMessage(null);
    setStep((current) => Math.max(0, current - 1));
  }

  // Avec un en-tête de retour, sa flèche revient à l'étape précédente (à partir de l'étape 2).
  const hasBackHeader = useBackStep(step > 0, previousStep);

  /** Noms envoyés pour des champs (un téléphone envoie aussi son pays). */
  function namesOf(fields: FormFieldDefinition[]): string[] {
    return fields.flatMap((field) => (field.type === 'phone' ? [field.name, countryKey(field.name)] : [field.name]));
  }

  function change(name: string, value: FieldValue) {
    // Liste dépendante : changer le parent vide ses enfants (ex. le pays vide la région).
    const children = definition.fields.filter((field) => field.depends_on === name).map((field) => field.name);

    setValues((current) => ({ ...current, [name]: value, ...Object.fromEntries(children.map((child) => [child, ''])) }));
    setErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  /**
   * Suggestion choisie : remplit les champs qu'elle décrit, s'ils sont dans le
   * formulaire et modifiables ; les autres valeurs sont ignorées.
   */
  function pick(picked: Record<string, string>) {
    const editable = new Set(
      definition.fields.filter((field) => !field.readonly && !field.locked && field.type !== 'hidden').map((field) => field.name),
    );
    const accepted = Object.fromEntries(Object.entries(picked).filter(([name]) => editable.has(name)));

    setValues((current) => ({ ...current, ...accepted }));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([name]) => !(name in accepted))));
  }

  /** Valeur des champs passés en paramètre des suggestions d'un champ. */
  function suggestionParams(field: FormFieldDefinition): Record<string, string> | undefined {
    return field.suggestions
      ? Object.fromEntries(field.suggestions.params.map((name) => [name, String(values[name] ?? '')]))
      : undefined;
  }

  /** Le champ tel qu'affiché : options filtrées par le parent, lecture seule. */
  function shown(field: FormFieldDefinition): FormFieldDefinition {
    if (!field.depends_on) {
      return field;
    }

    const parent = values[field.depends_on];

    return { ...field, options: field.options.filter((option) => option.parent === parent) };
  }

  function isDisabled(field: FormFieldDefinition): boolean {
    // Un téléphone verrouillé ne verrouille que son pays : le numéro reste à saisir.
    const locked = Boolean(field.locked) && field.type !== 'phone';

    return submitting || Boolean(field.readonly) || locked || (Boolean(field.depends_on) && !values[field.depends_on ?? '']);
  }

  /** Erreur d'un champ ; celle du pays d'un téléphone s'affiche sous le téléphone. */
  function errorOf(field: FormFieldDefinition): string | undefined {
    return fieldError(errors, field.name) ?? (field.type === 'phone' ? fieldError(errors, countryKey(field.name)) : undefined);
  }

  async function submit() {
    setSubmitting(true);
    setErrors({});
    setMessage(null);

    try {
      const all = submittedValues(definition, values);

      if (isLastStep) {
        await onSubmit(all);
      } else {
        // Étape intermédiaire : l'API valide ses seuls champs, puis l'étape suivante s'affiche.
        const names = new Set(namesOf(visibleFields));
        await formService.validateStep(definition.name, step + 1, Object.fromEntries(Object.entries(all).filter(([name]) => names.has(name))));
        setStep(step + 1);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldNames = namesOf(visibleFields);
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
      {((!hideTitle && definition.title !== null) || definition.subtitle !== null) && (
        <View style={styles.header}>
          {!hideTitle && definition.title !== null && (
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

      {currentStep && (
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.progress} testID="form-step-progress">
            {t('form.stepOf', { current: step + 1, total: steps.length })}
          </ThemedText>
          {currentStep.title !== null && (
            <ThemedText type="subtitle" accessibilityRole="header" testID="form-step-title">
              {currentStep.title}
            </ThemedText>
          )}
          {currentStep.subtitle && (
            <ThemedText themeColor="textSecondary" testID="form-step-subtitle">
              {currentStep.subtitle}
            </ThemedText>
          )}
        </View>
      )}

      {visibleFields.map((field) => (
        <FormField
          key={field.name}
          field={shown(field)}
          value={values[field.name]}
          onChange={(value) => change(field.name, value)}
          error={errorOf(field)}
          disabled={isDisabled(field)}
          onSubmitEditing={submit}
          country={field.type === 'phone' ? String(values[countryKey(field.name)] ?? '') : undefined}
          onCountryChange={field.type === 'phone' ? (country) => change(countryKey(field.name), country) : undefined}
          countryLocked={field.type === 'phone' && Boolean(field.locked)}
          suggestionParams={suggestionParams(field)}
          onSuggestion={field.suggestions ? pick : undefined}
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
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: destructive ? ERROR_COLOR : theme.primary },
          submitting && styles.disabled,
          pressed && styles.pressed,
        ]}>
        {submitting && <ActivityIndicator color={theme.onPrimary} />}
        <ThemedText style={{ color: theme.onPrimary }}>
          {submitting ? t('form.submitting') : isLastStep ? definition.submit.label : t('form.next')}
        </ThemedText>
      </Pressable>

      {step > 0 && !hasBackHeader && (
        <Pressable testID="form-previous" accessibilityRole="button" disabled={submitting} onPress={previousStep}>
          <ThemedText type="linkPrimary">← {t('form.previous')}</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  header: { gap: Spacing.one },
  progress: { textAlign: 'center' },
  message: { color: ERROR_COLOR },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    paddingVertical: Spacing.three,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
