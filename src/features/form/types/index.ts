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
  /** Choix multiples en puces sur une ligne qui défile ; valeur : la liste des options choisies (décision 2026-11-26-filtres-en-puces). */
  | 'chips'
  /** Intervalle `[min, max]`, chaque borne facultative. */
  | 'range'
  /** Fichiers envoyés un à un ; valeur : la liste ordonnée de leurs identifiants (décision 2026-11-19-contrat-champ-upload-photos). */
  | 'upload'
  /** Liste de groupes de sous-champs, ajoutés et retirés ; valeur : la liste des groupes (décision 2026-11-19-contrat-offer-informations). */
  | 'repeater';

export type FieldOption = {
  value: string;
  label: string;
  /** Complément affiché (ex. l'indicatif d'un pays). */
  hint?: string | null;
  /** Liste dépendante : valeur du champ parent à laquelle l'option appartient. */
  parent?: string | null;
  /** Une image devant le libellé (la photo d'un logement, décision 2026-11-27-select-images) ; absente : aucune. */
  image?: string | null;
};

export type FormFieldDefinition = {
  name: string;
  type: FieldType;
  label: string | null;
  /** Libellé à ne pas afficher (le titre d'étape le dit déjà) ; absent : affiché (décision 2026-11-19-nuit-ordre-photos-libelle). */
  label_hidden?: boolean;
  placeholder: string | null;
  help: string | null;
  /** Une note avant le libellé : un avertissement (décision 2026-11-22-champ-note) ; absente : aucune. */
  notice?: string | null;
  required: boolean;
  /** Affiché, non modifiable, jamais envoyé. */
  readonly?: boolean;
  /** Option unique choisie d'office (ex. le seul pays actif) : non modifiable, mais envoyée. */
  locked?: boolean;
  /** Affiché (et envoyé) seulement quand le champ `field` vaut `value`. */
  /** Afficher seulement quand `field` vaut `value`, ou l'une des `values`. */
  visible_when?: { field: string; value: string; values?: string[] } | null;
  /** Changer la valeur recharge le formulaire avec `?<nom>=<valeur>` (décision 2026-11-19-contrat-langue-saisie-allemand). */
  reloads?: boolean;
  /** Liste dépendante : nom du champ parent. */
  depends_on?: string | null;
  /** Nombre maximal de caractères (textarea : 1 000 par défaut), ou `null`. */
  max_length?: number | null;
  /** Bornes du calendrier d'une date (`AAAA-MM-JJ` ou `null`) ; absentes : toute date (décision 2026-11-19-bornes-des-dates). */
  /**
   * Les bornes du champ et son incrément, une seule notion (décision 2026-11-27-cle-range) : une date (`AAAA-MM-JJ` ou
   * `null`, sans incrément) ou une note (nombres) ; absent pour un autre champ.
   */
  range?: { min: string | number | null; max: string | number | null; step?: number | null } | null;
  /** Une note : ses étoiles affichées ou non (décision 2026-11-27-note-bornes-etoiles). */
  stars?: boolean | null;
  /** Les formats de ses dates (options d'`Intl.DateTimeFormat`), servis par l'API (décision 2026-11-25-dates-formatees-serveur). */
  date_formats?: Partial<import('../utils/dates').DateFormats> | null;
  /**
   * Grille de mois au lieu du sélecteur natif (décision 2026-11-19-contrat-calendrier-offre) :
   * jours indisponibles grisés ; `after` : le champ du début d'une période (les jours
   * comptent alors comme des nuits). Absente : sélecteur natif.
   */
  calendar?: { unavailable: string[]; after: string | null } | null;
  /** Liste déroulante : une recherche en tête des options, quel que soit leur nombre ; absent : au-delà de 12. */
  searchable?: boolean;
  /** Au plus ce nombre d'options affichées, la recherche trouve les autres (décision 2026-11-27-select-limite) ; absent : `SEARCHABLE_LIMIT` pour une liste à rechercher, toutes sinon. */
  search_limit?: number | null;
  /** Un filtre de liste sans l'option « Tous » (décision 2026-11-25-region-sans-tous) ; absent : avec. */
  all_option?: boolean;
  /** Un filtre propre au pays (région, ville…), remis à zéro quand on change de pays (décision 2026-11-25-region-en-tete-recherche). */
  country_scoped?: boolean;
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
  /** Champ de fichiers (`upload`) : limites déclarées par l'API ; `null` (ou absent) pour un autre type. */
  upload?: UploadSettings | null;
  /** Liste de groupes (`repeater`) : sous-champs d'un groupe, nombre maximal, libellé du bouton d'ajout ; `null` (ou absent) pour un autre type. */
  repeater?: RepeaterSettings | null;
  default: unknown;
  options: FieldOption[];
};

/** Un fichier déjà enregistré : son identifiant (la valeur du champ) et son adresse. */
export type UploadedFileRef = { id: string; url: string };

/**
 * Limites d'un champ de fichiers, déclarées par Laravel (décision
 * 2026-11-19-contrat-champ-upload-photos) : types MIME acceptés, taille maximale
 * d'un fichier (Ko), nombre maximal, adresse d'envoi (relative à l'API), fichiers
 * déjà enregistrés.
 */
export type UploadSettings = {
  accept: string[];
  max_size_kb: number;
  max_files: number;
  /** Libellé du bouton d'ajout (« Ajouter un logo ») ; à défaut, celui de l'app (décision 2026-11-24-champ-fichier-libelle-ajout). */
  add_label?: string | null;
  endpoint: string;
  files: UploadedFileRef[];
};

/** Réglages d'une liste de groupes, déclarés par Laravel. */
export type RepeaterSettings = {
  fields: FormFieldDefinition[];
  max_items: number;
  add_label: string | null;
};

/** Un groupe d'une liste : sous-champ => valeur (un sous-champ `hidden` garde l'identifiant). */
export type RepeaterItem = Record<string, string>;

/** Une suggestion : la valeur du champ, son libellé, et les autres champs qu'elle remplit. */
export type FieldSuggestion = { value: string; label: string; fill: Record<string, string> };

export type FormDefinition = {
  name: string;
  /** Titre affiché au-dessus du formulaire, ou `null`. */
  title: string | null;
  /** Le titre de la barre du haut ; absent ou `null` : le titre (décision 2026-11-22-formulaire-titre-navigation). */
  navigation_title?: string | null;
  /** Sous-titre affiché sous le titre, ou `null`. */
  subtitle: string | null;
  /** Une description sous le sous-titre, en gris (le titre d'une offre, décision 2026-11-22-formulaire-description) ; absente : aucune. */
  description?: string | null;
  /** Une note à part, sous le titre et le sous-titre : un avertissement (décision 2026-11-22-formulaire-note) ; absente : aucune. */
  notice?: string | null;
  /** Alignement du titre, du sous-titre et des titres d'étape ; absent : `start` (décision 2026-11-19-alignement-titre-formulaire). */
  title_align?: 'start' | 'center';
  fields: FormFieldDefinition[];
  /** Étapes, dans l'ordre ; vide (ou absent) pour un formulaire d'un seul tenant. */
  steps?: FormStep[];
  /** Liens sous le formulaire, chacun ouvre un autre formulaire (« Vérifier mon adresse ») ; vide ou absent : aucun (décision 2026-11-27-formulaire-liens). */
  links?: FormLink[];
  submit: FormSubmit;
};

/** Un lien sous un formulaire : son texte et le formulaire qu'il ouvre (`/profile/[form]`). */
export type FormLink = { label: string; form: string };

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

/** Valeur d'un champ : texte, booléen (case, interrupteur), liste (cases multiples) ou liste de groupes. */
export type FieldValue = string | boolean | string[] | RepeaterItem[];

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
  /** Toutes les erreurs de l'API : une liste de groupes y lit celles de ses sous-champs (`informations.0.title`). */
  errors?: FormErrors;
  /** Champ date d'une fin de période : la valeur du champ de début (`calendar.after`). */
  afterValue?: string;
};
