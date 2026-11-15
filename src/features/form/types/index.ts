/**
 * Définition d'un formulaire telle que l'API l'envoie (`GET /api/v1/forms/{form}`,
 * `FormResource` du contrat `openapi.json`). L'app l'affiche, sans rien décider.
 */

export type FieldType =
  | 'text'
  | 'hidden'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkbox_group'
  | 'switch';

export type FieldOption = { value: string; label: string };

export type FormFieldDefinition = {
  name: string;
  type: FieldType;
  label: string | null;
  placeholder: string | null;
  help: string | null;
  required: boolean;
  default: unknown;
  options: FieldOption[];
};

export type FormDefinition = {
  name: string;
  fields: FormFieldDefinition[];
  submit: { label: string };
};

export type FormResponse = { data: FormDefinition };

/** Valeur d'un champ : texte, booléen (case, interrupteur) ou liste (cases multiples). */
export type FieldValue = string | boolean | string[];

export type FormValues = Record<string, FieldValue>;

/** Erreurs de validation renvoyées par l'API (422), par nom de champ. */
export type FormErrors = Record<string, string[]>;

/** Ce que reçoit chaque composant de champ. */
export type FieldProps<V extends FieldValue = FieldValue> = {
  field: FormFieldDefinition;
  value: V;
  onChange: (value: V) => void;
  error?: string;
  disabled?: boolean;
  /** Touche « Entrée » / « OK » du clavier dans un champ texte : envoie le formulaire. */
  onSubmitEditing?: () => void;
};
