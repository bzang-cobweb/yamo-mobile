import type { FormFieldDefinition, FormSubmit } from '@/features/form/types';

/**
 * Retrait d'un item : libellé du bouton, question de confirmation, et envoi
 * décrit comme celui d'un formulaire (méthode, point d'API, suite).
 */
export type ListItemDelete = Omit<FormSubmit, 'label'> & { label: string; confirm: string };

/** Cœur de favori : état, et point d'API relatif (`/v1/…`). */
export type ListItemFavorite = { active: boolean; endpoint: string };

/**
 * Un bouton sur la carte (décision 2026-11-19-contrat-reservations-logements-profil) :
 * il envoie `submission` (après `confirm`, s'il y en a une) ou ouvre le formulaire `form`.
 */
export type ListItemAction = {
  label: string;
  style: 'primary' | 'destructive' | 'default' | string;
  confirm: string | null;
  submission: Omit<FormSubmit, 'label'> | null;
  form: { form: string; record: string } | null;
  /** Écran de l'app à ouvrir (« /offers/12/calendar ») ; `null` (ou absent) : aucun. */
  link?: string | null;
  /** Avec `filter` : les filtres déjà choisis de l'écran `link`, rangés sous `list` (décision 2026-11-21-lien-notifications). */
  list?: string | null;
  filter?: Record<string, string>;
};

/** Un compteur sur la carte (« 2 demandes en attente ») qui ouvre `list` (ou l'écran `link`) avec ces filtres. */
export type ListItemCounter = {
  label: string;
  /** La liste ouverte, ou le nom des filtres de l'écran `link`. */
  list: string;
  filter: Record<string, string>;
  /** Un écran de l'app à ouvrir à la place de la liste (« /notifications ») ; absent : la liste. */
  link?: string | null;
  /** Sa couleur (`warning`, `success`…) : une pastille sous le titre ; absent : en bas de la carte (décision 2026-11-21-pastille-demandes-en-attente). */
  tone?: string | null;
};

/** Un item d'une liste : titre, sous-titre, photo, note, phrase mise en avant, message cité, formulaire d'édition, retrait. */
export type ListItem = {
  id: string;
  title: string;
  subtitle: string | null;
  /** Une ligne à part sous le sous-titre (le type de demande et les dates d'une réservation, décision 2026-11-22-reservations-ligne-dates) ; absente : aucune. */
  detail?: string | null;
  /** Une date ISO 8601 sous le message, à droite, dite en temps relatif (décision 2026-11-22-demandes-date-derniere-notification) ; absente : aucune. */
  date?: string | null;
  /** Le nombre de notifications non lues, en pastille à droite du message (décision 2026-11-22-demandes-pastille-nombre-message) ; absent : aucune. */
  unread_count?: number;
  /** Photo (URL), affichée au-dessus du titre ; `null` : aucune. */
  image: string | null;
  /** Note moyenne (1 à 5) et nombre de notes ; `null` : aucune (décision 2026-11-19-contrat-avis-offres). */
  rating: { average: number; count: number } | null;
  /** Phrase mise en avant, en gras sur sa ligne ; `null` : aucune. */
  highlight: string | null;
  /** Message cité sous le sous-titre (celui d'un membre avec sa demande) ; `null` (ou absent) : aucun. */
  quote?: string | null;
  /**
   * Cœur de favori sur la photo (décision 2026-11-19-contrat-vedette-favoris) : plein si
   * `active` ; PUT sur `endpoint` ajoute, DELETE retire ; `null` (ou absent) : pas de cœur.
   */
  favorite?: ListItemFavorite | null;
  /** Écran de l'app ouvert en touchant l'item (« /offers/12 ») ; `null` (ou absent) : aucun. */
  link?: string | null;
  /** L'écran ouvert en touchant le titre seul (« /members/3 ») : le titre s'affiche en lien (décision 2026-11-21-demandes-lien-membre) ; absent : non. */
  title_link?: string | null;
  /** Le sous-titre en lien vers son propre écran (le titre saisi d'une offre, « /offers/12 »), le reste de la carte gardant le sien (décision 2026-11-22-reservations-lien-offre). */
  subtitle_link?: string | null;
  /** `contain` : l'image en entier, au centre (un logo, décision 2026-11-24-mes-partenaires-logo-entier) ; absent : remplie. */
  image_fit?: 'contain' | null;
  /** L'image en petit à gauche du texte (`side`, « Mes partenaires », décision 2026-11-24-mes-partenaires-comme-partenaires) ; sinon au-dessus. */
  image_layout?: 'side' | null;
  /** Le sous-titre coupé à ce nombre de lignes, la suite en « … » (décision 2026-11-24-mes-partenaires-cartes) ; absent : entier. */
  subtitle_lines?: number | null;
  /** Toucher l'item ouvre ce formulaire, lié à l'enregistrement `record`. */
  edit: { form: string; record: string } | null;
  /** Boutons de la carte ; vide ou absent : aucun. */
  actions?: ListItemAction[];
  /** Pastille de couleur (un statut) ; `null` (ou absent) : aucune (décision 2026-11-19-contrat-reservations-logements-profil). */
  /** `on_image` : sur la photo, à la place du cœur (décision 2026-11-21-statut-a-la-place-du-coeur). */
  tag?: { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' | string; on_image?: boolean } | null;
  /** Compteur de la carte ; `null` (ou absent) : aucun. */
  counter?: ListItemCounter | null;
  /** Ses compteurs, dans l'ordre (le premier est `counter`) ; vide ou absent : `counter` seul (décision 2026-11-21-compteur-non-lues). */
  counters?: ListItemCounter[];
  delete: ListItemDelete | null;
};

/**
 * Une liste décrite par l'API (`GET /api/v1/lists/{name}`), que l'app affiche
 * sans la connaître d'avance (décision 2026-11-18-adresses-liste-generique).
 */
export type ListDefinition = {
  name: string;
  title: string;
  /**
   * Intitulé sous les filtres, en tête des items : un titre et, dessous, un sous-titre (le logement des « Demandes »
   * et sa ligne du type, décisions 2026-11-21-demandes-titre-sous-filtres et 2026-11-21-demandes-d-une-offre) ; absent : aucun.
   */
  heading?: { title: string | null; subtitle: string | null } | null;
  /** Texte affiché quand la liste est vide. */
  empty: string | null;
  /** Bouton de création : libellé et formulaire ouvert ; `null` pour une liste en lecture seule. */
  create: { label: string; form: string } | null;
  /** Bouton de la barre fixe en bas : un formulaire à ouvrir, ou un écran de l'app (`/`) ; `null` (ou absent) : aucun. */
  footer?: { label: string; form: string | null; link: string | null } | null;
  /** Les actions des cartes dans un menu déroulant « Actions » (décision 2026-11-21-actions-en-menu) ; absent : non. */
  menu?: boolean;
  /** Texte d'aide du champ de recherche ; `null` : liste non cherchable (décision 2026-11-18-recherche-dans-la-liste). */
  search: string | null;
  /** Filtres proposés, en champs de formulaire (`?filter[nom]=valeur`) ; vide ou absent : aucun (décision 2026-11-19-contrat-filtres-vitrine). */
  filters?: FormFieldDefinition[];
  /** Curseur de la page suivante ; `null` : plus rien après (décision 2026-11-18-contrat-liste-infinie-role-admin). */
  next_cursor: string | null;
  /** Items de cette page. */
  items: ListItem[];
};

export type ListResponse = { data: ListDefinition };
