import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, NetworkError } from '@/shared/api/errors';
import { useFixedFooter, type RevealTarget } from '@/shared/components/FixedFooterLayout';
import { useI18n } from '@/shared/i18n/I18nContext';
import { useBackStep } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

import { formService } from '../services/FormService';
import type { FieldValue, FormDefinition, FormErrors, FormFieldDefinition, FormValues } from '../types';
import { countryKey, fieldError, hasPendingUploads, initialValues, isVisible, submittedValues } from '../utils/values';
import { ERROR_COLOR } from './FieldShell';
import { FormField } from './FormField';

type DynamicFormProps = {
  definition: FormDefinition;
  /** Envoie les valeurs ; une `ApiError` 422 est affichée sous les champs concernés. */
  onSubmit: (values: FormValues) => Promise<void>;
  /** Le titre est affiché par l'en-tête de l'écran : le formulaire ne le répète pas. */
  hideTitle?: boolean;
  /** Un champ qui recharge le formulaire (`reloads`) a changé : le redemander avec sa valeur. */
  onReload?: (field: string, value: string) => void;
  /** L'enregistrement auquel le formulaire est lié : envoyé avec la validation d'une étape. */
  record?: string;
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
 * Dans un écran à barre fixe (`FixedFooterLayout`), le bouton d'envoi y est placé,
 * en bas de l'écran (décision 2026-11-19-contrat-bouton-fixe-formulaires) ; un envoi
 * refusé fait défiler jusqu'au premier champ en erreur. Sinon, il reste sous les champs.
 *
 * Pour repartir des valeurs par défaut (autre formulaire, autre langue), le
 * monter avec une `key` différente.
 */
export function DynamicForm({ definition, onSubmit, hideTitle = false, onReload, record }: DynamicFormProps) {
  const destructive = definition.submit.destructive === true;
  // L'alignement des titres vient de la définition du formulaire (décision 2026-11-19-alignement-titre-formulaire).
  const titleAlign = { textAlign: definition.title_align === 'center' ? 'center' : 'left' } as const;
  const { t } = useI18n();
  const [values, setValues] = useState<FormValues>(() => initialValues(definition));
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const uploading = hasPendingUploads(values);
  const steps = definition.steps ?? [];
  const [step, setStep] = useState(0);
  const isLastStep = steps.length === 0 || step === steps.length - 1;
  const currentStep = steps[step];
  // Les champs de l'étape, dans l'ordre où l'étape les cite.
  const visibleFields = (
    currentStep
      ? currentStep.fields.flatMap((name) => definition.fields.filter((field) => field.name === name))
      : definition.fields
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
    // Un champ qui recharge le formulaire (la langue de saisie, décision 2026-11-19-contrat-langue-saisie-allemand) :
    // les autres valeurs vont être remplacées ; si elles ont changé, on demande d'abord.
    const reloading = definition.fields.find((field) => field.name === name)?.reloads === true;
    if (reloading && onReload && typeof value === 'string' && value !== values[name]) {
      const initial = initialValues(definition);
      const edited = Object.keys(values).some((key) => key !== name && JSON.stringify(values[key]) !== JSON.stringify(initial[key]));
      if (edited) {
        Alert.alert(t('form.reloadConfirm'), undefined, [
          { text: t('list.cancel'), style: 'cancel' },
          { text: t('form.reloadContinue'), style: 'destructive', onPress: () => onReload(name, value) },
        ]);
      } else {
        onReload(name, value);
      }

      return;
    }

    // Liste dépendante : changer le parent vide ses enfants (ex. le pays vide la région).
    const children = definition.fields.filter((field) => field.depends_on === name).map((field) => field.name);

    setValues((current) => ({ ...current, [name]: value, ...Object.fromEntries(children.map((child) => [child, ''])) }));
    setErrors(({ [name]: _cleared, ...rest }) => rest);
  }

  /**
   * Le champ tel qu'affiché : options filtrées par le parent ; unité qui suit la
   * valeur d'un autre champ (« FCFA / jour » si « Meublé » est coché).
   */
  function shown(field: FormFieldDefinition): FormFieldDefinition {
    let current = field;

    if (field.suffix_when) {
      const other = values[field.suffix_when.field];
      current = { ...current, suffix: field.suffix_when.suffixes[String(other ?? '')] ?? field.suffix };
    }

    if (!field.depends_on) {
      return current;
    }

    const parent = values[field.depends_on];

    return { ...current, options: field.options.filter((option) => option.parent === parent) };
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

  // La barre fixe de l'écran, s'il en a une : le bouton d'envoi y va.
  const footer = useFixedFooter();
  const footerId = useId();
  const root = useRef<RevealTarget>(null);
  const fieldViews = useRef<Record<string, RevealTarget | null>>({});
  // La dernière version de `submit` (elle lit l'état courant), pour le bouton de la barre.
  const submitRef = useRef<() => Promise<void>>(async () => undefined);
  const [revealError, setRevealError] = useState(0);
  const busy = submitting || uploading;
  const buttonLabel = submitting ? t('form.submitting') : isLastStep ? definition.submit.label : t('form.next');

  useEffect(() => {
    submitRef.current = submit;
  });

  // Avant que l'écran soit peint : la barre apparaît avec le formulaire, sans délai.
  useLayoutEffect(() => {
    if (footer === null) {
      return;
    }
    footer.set(
      footerId,
      <SubmitButton label={buttonLabel} busy={busy} submitting={submitting} destructive={destructive} onPress={() => void submitRef.current()} />,
    );
  }, [footer, footerId, buttonLabel, busy, submitting, destructive]);

  // En partant (formulaire fermé), il rend la barre.
  useLayoutEffect(() => () => footer?.set(footerId, null), [footer, footerId]);

  // Une autre étape (suivante ou précédente) s'affiche depuis son début ; pas au premier affichage.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current !== step) {
      shownStep.current = step;
      footer?.reveal(root.current);
    }
  }, [footer, step]);

  // Un envoi refusé : jusqu'au premier champ en erreur, dans l'ordre d'affichage.
  useEffect(() => {
    if (revealError === 0 || footer === null) {
      return;
    }
    const first = visibleFields.find((field) => errorOf(field) !== undefined);
    if (first) {
      footer.reveal(fieldViews.current[first.name] ?? null);
    }
    // Seulement après un envoi refusé, pas à chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealError]);

  async function submit() {
    if (uploading) {
      return;
    }

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
        await formService.validateStep(definition.name, step + 1, Object.fromEntries(Object.entries(all).filter(([name]) => names.has(name))), record);
        setStep(step + 1);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldNames = namesOf(visibleFields);
        setErrors(error.errors);
        // Erreur qui ne vise aucun champ affiché (trop d'essais, champ ajouté par l'app…) : message général.
        const onFields = Object.keys(error.errors).some((key) => fieldNames.includes(key.split('.')[0]));
        setMessage(onFields ? null : (Object.values(error.errors)[0]?.[0] ?? error.message));
        setRevealError((count) => count + 1);
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
    <View ref={root} collapsable={false} style={styles.form} testID={`form-${definition.name}`}>
      {((!hideTitle && definition.title !== null) || definition.subtitle !== null) && (
        <View style={styles.header}>
          {!hideTitle && definition.title !== null && (
            <ThemedText type="subtitle" accessibilityRole="header" style={titleAlign} testID="form-title">
              {definition.title}
            </ThemedText>
          )}
          {/* Le titre dans la barre du haut : le sous-titre (le titre de l'offre d'une demande) prend le style de titre,
              en tête du contenu (décision 2026-11-22-formulaire-sous-titre-style-titre) ; sinon, en gris sous le titre. */}
          {definition.subtitle !== null &&
            (hideTitle ? (
              <ThemedText type="subtitle" accessibilityRole="header" style={titleAlign} testID="form-subtitle">
                {definition.subtitle}
              </ThemedText>
            ) : (
              <ThemedText themeColor="textSecondary" style={titleAlign} testID="form-subtitle">
                {definition.subtitle}
              </ThemedText>
            ))}
        </View>
      )}

      {currentStep && (
        <View style={styles.header}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.progress} testID="form-step-progress">
            {t('form.stepOf', { current: step + 1, total: steps.length })}
          </ThemedText>
          {currentStep.title !== null && (
            <ThemedText type="subtitle" accessibilityRole="header" style={titleAlign} testID="form-step-title">
              {currentStep.title}
            </ThemedText>
          )}
          {currentStep.subtitle && (
            <ThemedText themeColor="textSecondary" style={titleAlign} testID="form-step-subtitle">
              {currentStep.subtitle}
            </ThemedText>
          )}
        </View>
      )}

      {visibleFields.map((field) => (
        <View
          key={field.name}
          collapsable={false}
          ref={(view) => {
            fieldViews.current[field.name] = view;
          }}>
          <FormField
            field={shown(field)}
            value={values[field.name]}
            onChange={(value) => change(field.name, value)}
            error={errorOf(field)}
            errors={errors}
            disabled={isDisabled(field)}
            onSubmitEditing={submit}
            country={field.type === 'phone' ? String(values[countryKey(field.name)] ?? '') : undefined}
            onCountryChange={field.type === 'phone' ? (country) => change(countryKey(field.name), country) : undefined}
            countryLocked={field.type === 'phone' && Boolean(field.locked)}
            onFill={(filled) => Object.entries(filled).forEach(([name, filledValue]) => change(name, filledValue))}
            afterValue={field.calendar?.after ? String(values[field.calendar.after] ?? '') : undefined}
          />
        </View>
      ))}

      {message && (
        <ThemedText type="small" style={styles.message} accessibilityRole="alert" testID="form-message">
          {message}
        </ThemedText>
      )}

      {/* Sans barre fixe : le bouton sous les champs. */}
      {footer === null && <SubmitButton label={buttonLabel} busy={busy} submitting={submitting} destructive={destructive} onPress={() => void submit()} />}

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

/**
 * Le bouton d'envoi : « Suivant » ou le libellé d'envoi ; rouge pour une action
 * irréversible ; désactivé pendant un envoi (un fichier en cours d'envoi : l'étape
 * et l'enregistrement attendent, décision 2026-11-19-contrat-champ-upload-photos).
 */
export function SubmitButton({
  label,
  busy,
  submitting,
  destructive,
  onPress,
  testID = 'form-submit',
}: {
  label: string;
  busy: boolean;
  submitting: boolean;
  destructive: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy}
      accessibilityState={{ disabled: busy }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: destructive ? ERROR_COLOR : theme.primary },
        busy && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {submitting && <ActivityIndicator color={theme.onPrimary} />}
      <ThemedText style={{ color: theme.onPrimary }}>{label}</ThemedText>
    </Pressable>
  );
}
