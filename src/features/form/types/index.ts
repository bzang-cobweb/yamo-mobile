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
  | 'segmented'
  /** Note en étoiles, valeur « 1 » à « 5 » (décision 2026-11-19-contrat-avis-offres). */
  | 'rating'
  /** Liste déroulante à choix multiples : la liste des options choisies. */
  | 'multiselect'
  /** Intervalle `[min, max]`, chaque borne facultative. */
  | 'range';

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
  /** Unité affichée après la valeur (« m² »), ou `null` (décision 2026-11-18-fiche-offre). */
  suffix?: string | null;
  /**
   * Unité qui suit la valeur d'un autre champ (`suffixes` : valeur => unité, « true »
   * ou « false » pour une case) ; `suffix` à défaut (décision 2026-11-18-unite-prix-chambres).
   */
  suffix_when?: { field: string; suffixes: Record<string, string> } | null;
  /**
   * Suggestions pendant la saisie d'un texte : point d'API relatif (`/v1/…`), appelé
   * avec `?q=` ; `null` (ou absent) : aucune (décision 2026-11-19-contrat-adresse-offre-recherche).
   */
  suggestions?: string | null;
  default: unknown;
  options: FieldOption[];
};

/** Une suggestion : la valeur du champ, son libellé, et les autres champs qu'elle remplit. */
export type FieldSuggestion = { value: string; label: string; fill: Record<string, string> };

export type FormDefinition = {
  name: string;
  /** Titre affiché au-dessus du formulaire, ou `null`. */
  title: string | null;
  /** Sous-titre affiché sous le titre, ou `null`. */
  subtitle: string | null;
  /** Alignement du titre, du sous-titre et des titres d'étape ; absent : `start` (décision 2026-11-19-alignement-titre-formulaire). */
  title_align?: 'start' | 'center';
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
  /**
   * Suite au succès, avec le message à afficher : `profile` (retour au profil),
   * `sign-out` (déconnexion) ou `back` (retour à l'écran précédent, une liste).
   */
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
  /** Une suggestion choisie remplit d'autres champs (`{ zip, city }`). */
  onFill?: (values: Record<string, string>) => void;
};
