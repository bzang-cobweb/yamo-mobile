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

export function initialValues(definition: FormDefinition): FormValues {
  return Object.fromEntries(definition.fields.map((field) => [field.name, initialValue(field)]));
}

/** Premier message d'erreur de l'API pour un champ (un groupe de cases reçoit aussi `tags.1`…). */
export function fieldError(errors: Record<string, string[]>, name: string): string | undefined {
  return errors[name]?.[0] ?? Object.entries(errors).find(([key]) => key.startsWith(`${name}.`))?.[1][0];
}
