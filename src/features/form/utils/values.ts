import type { FieldOption, FieldValue, FormDefinition, FormFieldDefinition, FormValues } from '../types';

/**
 * Un choix Oui / Non obligatoire : un interrupteur, qui envoie « yes » ou « no »
 * (décision 2026-11-23-regles-oui-non-obligatoires).
 */
export function isYesNoSwitch(field: FormFieldDefinition): boolean {
  return field.type === 'select' && field.required && field.options.map((option) => option.value).join(',') === 'yes,no';
}

/** Valeur de départ d'un champ : la valeur par défaut de l'API, sinon le « vide » de son type. */
export function initialValue(field: FormFieldDefinition): FieldValue {
  // L'interrupteur éteint vaut « no » : un champ non renseigné part sur Non.
  if (isYesNoSwitch(field)) {
    return field.default === 'yes' ? 'yes' : 'no';
  }
  switch (field.type) {
    case 'checkbox':
    case 'switch':
      return field.default === true;
    case 'checkbox_group':
    case 'multiselect':
    case 'upload':
      return Array.isArray(field.default) ? field.default.map(String) : [];
    case 'repeater':
      // Les groupes enregistrés, chaque valeur en texte.
      return Array.isArray(field.default)
        ? (field.default as unknown[]).map((item) =>
            Object.fromEntries(Object.entries((item ?? {}) as Record<string, unknown>).map(([key, value]) => [key, value == null ? '' : String(value)])),
          )
        : [];
    case 'range':
      // Deux bornes, vides au départ.
      return Array.isArray(field.default) ? [0, 1].map((index) => (field.default as unknown[])[index] == null ? '' : String((field.default as unknown[])[index])) : ['', ''];
    default:
      return field.default === null || field.default === undefined ? '' : String(field.default);
  }
}

/** Clé du pays d'un champ téléphone. */
export function countryKey(name: string): string {
  return `${name}_country`;
}

export function initialValues(definition: FormDefinition): FormValues {
  return Object.fromEntries(
    definition.fields.flatMap((field): [string, FieldValue][] => {
      if (field.type === 'phone') {
        // Valeur par défaut d'un téléphone : `{ country, number }`.
        const phone = (field.default ?? {}) as { country?: string | null; number?: string | null };

        return [
          [field.name, phone.number ?? ''],
          [countryKey(field.name), phone.country ?? ''],
        ];
      }

      return [[field.name, initialValue(field)]];
    }),
  );
}

/** Le champ est-il affiché ? Non si sa condition (`visible_when`) n'est pas remplie. */
export function isVisible(field: FormFieldDefinition, values: FormValues): boolean {
  // Une case vaut « true » ou « false » (décision 2026-11-19-charges-meuble-surface-facultative).
  if (!field.visible_when) {
    return true;
  }
  const value = String(values[field.visible_when.field] ?? '');

  return (field.visible_when.values ?? [field.visible_when.value]).includes(value);
}

/**
 * Les options d'une liste dépendante (`depends_on`) : celles dont le parent est la valeur choisie dans le champ
 * parent (la région du pays ; le statut du type de notification, décision
 * 2026-11-24-notifications-types-reservation-partenaire).
 */
export function dependentOptions(field: FormFieldDefinition, values: FormValues): FieldOption[] {
  if (!field.depends_on) {
    return field.options;
  }
  const parent = String(values[field.depends_on] ?? '');

  return field.options.filter((option) => option.parent === parent);
}

/**
 * Ce qui part à l'API : tout sauf les champs en lecture seule et ceux que leur
 * condition masque (un téléphone ne part pas non plus avec son pays). Un champ
 * verrouillé (`locked`), lui, part.
 */
export function submittedValues(definition: FormDefinition, values: FormValues): FormValues {
  const skipped = new Set(
    definition.fields
      .filter((field) => field.readonly || !isVisible(field, values))
      .flatMap((field) => (field.type === 'phone' ? [field.name, countryKey(field.name)] : [field.name])),
  );

  return Object.fromEntries(Object.entries(values).filter(([name]) => !skipped.has(name)));
}

/** Premier message d'erreur de l'API pour un champ (un groupe de cases reçoit aussi `tags.1`…). */
export function fieldError(errors: Record<string, string[]>, name: string): string | undefined {
  return errors[name]?.[0] ?? Object.entries(errors).find(([key]) => key.startsWith(`${name}.`))?.[1][0];
}

/**
 * Un fichier en cours d'envoi : sa place est tenue dans la valeur du champ par un
 * identifiant provisoire, remplacé par celui de l'API à la fin de l'envoi.
 */
export const PENDING_UPLOAD = 'pending:';

/** Un envoi de fichier est-il en cours ? L'étape et l'enregistrement attendent. */
export function hasPendingUploads(values: FormValues): boolean {
  return Object.values(values).some((value) => Array.isArray(value) && value.some((item) => typeof item === 'string' && item.startsWith(PENDING_UPLOAD)));
}
