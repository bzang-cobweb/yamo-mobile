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
  | 'switch'
  /** Date seule, valeur `AAAA-MM-JJ` (vide : pas de date). */
  | 'date'
  /** Pays (indicatif) + numéro ; valeurs `<nom>` et `<nom>_country`. */
  | 'phone'
  /** Code de vérification à 6 chiffres. */
  | 'code'
  /** Choix parmi quelques options, en boutons côte à côte (ex. « E-mail | Téléphone »). */
  | 'segmented';

export type FieldOption = {
  value: string;
  label: string;
  /** Complément affiché (ex. l'indicatif d'un pays). */
  hint?: string | null;
  /** Liste dépendante : valeur du champ parent à laquelle l'option appartient. */
  parent?: string | null;
};

export type FormFieldDefinition = {
  name: string;
  type: FieldType;
  label: string | null;
  placeholder: string | null;
  help: string | null;
  required: boolean;
  /** Affiché, non modifiable, jamais envoyé. */
  readonly?: boolean;
  /** Option unique choisie d'office (ex. le seul pays actif) : non modifiable, mais envoyée. */
  locked?: boolean;
  /** Affiché (et envoyé) seulement quand le champ `field` vaut `value`. */
  visible_when?: { field: string; value: string } | null;
  /** Liste dépendante : nom du champ parent. */
  depends_on?: string | null;
  /** Nombre maximal de caractères (textarea : 1 000 par défaut), ou `null`. */
  max_length?: number | null;
  default: unknown;
  options: FieldOption[];
};

export type FormDefinition = {
  name: string;
  /** Titre affiché au-dessus du formulaire, ou `null`. */
  title: string | null;
  /** Sous-titre affiché sous le titre, ou `null`. */
  subtitle: string | null;
  fields: FormFieldDefinition[];
  /** Étapes, dans l'ordre ; vide (ou absent) pour un formulaire d'un seul tenant. */
  steps?: FormStep[];
  submit: FormSubmit;
};

/**
 * Bouton d'envoi. Pour un formulaire que l'app envoie sans le connaître d'avance
 * (formulaires du profil), l'API décrit aussi l'envoi et sa suite.
 */
export type FormSubmit = {
  label: string;
  /** Méthode HTTP de l'envoi. */
  method?: string;
  /** Point d'API, relatif à l'API (`/v1/…`). */
  endpoint?: string;
  /** Action irréversible : bouton rouge. */
  destructive?: boolean;
  /** Suite au succès : `profile` (retour au profil) ou `sign-out` (déconnexion), avec le message à afficher. */
  success?: { action: string; message: string };
};

/** Une étape : titre facultatif et noms des champs qu'elle affiche. */
export type FormStep = {
  title: string | null;
  /** Texte sous le titre de l'étape, ou `null`. */
  subtitle?: string | null;
  fields: string[];
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
  /** Champ téléphone : pays choisi (code ISO) et son changement. */
  country?: string;
  onCountryChange?: (country: string) => void;
  /** Champ téléphone : pays verrouillé (le seul actif), le numéro reste modifiable. */
  countryLocked?: boolean;
};
