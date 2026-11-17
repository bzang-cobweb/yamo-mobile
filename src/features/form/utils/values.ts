import type { FieldValue, FormDefinition, FormFieldDefinition, FormValues } from '../types';

/** Valeur de départ d'un champ : la valeur par défaut de l'API, sinon le « vide » de son type. */
export function initialValue(field: FormFieldDefinition): FieldValue {
  switch (field.type) {
    case 'checkbox':
    case 'switch':
      return field.default === true;
    case 'checkbox_group':
      return Array.isArray(field.default) ? field.default.map(String) : [];
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
  return !field.visible_when || values[field.visible_when.field] === field.visible_when.value;
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
