import type { ListItem, ListItemAction, ListItemDelete, ListItemFavorite } from '@/features/list/types';

/**
 * La fiche d'une offre, décrite par l'API (`GET /api/v1/offers/{id}`, décision
 * 2026-11-18-fiche-offre) : l'app l'affiche sans connaître le domaine.
 */
export type OfferDetail = {
  id: string;
  title: string;
  /** Le titre composé (« Location meublée · Studio · Douala »), sous le titre (décision 2026-11-22-fiche-titres-centres) ; `null` (ou absent) : aucun. */
  composed_title?: string | null;
  /** Prix formaté et son libellé (« Loyer mensuel ») ; `null` sans prix. */
  price: { label: string; value: string } | null;
  /** La ville ; jamais la rue. */
  location: string | null;
  /** Indications sur l'adresse écrites par le propriétaire (décision 2026-11-19-description-adresse-offre) ; `null` (ou absent) : aucune. */
  /** Indication propre à l'offre sur son adresse (décision 2026-11-19-contrat-adresse-offre-table). */
  /** Adresse complète en une ligne, rue comprise (décision 2026-11-19-fiche-localisation). */
  address?: string | null;
  indication?: string | null;
  photos: string[];
  /** Les mêmes photos en grand, pour la galerie plein écran (décision 2026-11-25-galerie-plein-ecran) ; absent d'une API plus ancienne. */
  gallery?: string[];
  description: string | null;
  /** Caractéristiques lisibles, dans l'ordre. */
  facts: { label: string; value: string }[];
  /** Règles du logement renseignées (décision 2026-11-19-contrat-regles-informations). */
  rules?: { label: string; value: string }[];
  /** Blocs d'informations, dans l'ordre : titre et description (décision 2026-11-19-contrat-offer-informations). */
  informations?: { id: string; title: string; description: string }[];
  /** Sections repliables, complètes, dans l'ordre et l'ouverture servis par Laravel (décisions 2026-11-19-sections-fiche-laravel et 2026-11-19-sections-construites-laravel). */
  sections?: OfferSection[];
  published_at: string | null;
  /** La date de publication formatée par le serveur (« 18 novembre 2026 », décision 2026-11-25-dates-formatees-serveur). */
  published_on?: string | null;
  /** Statut, servi au seul propriétaire. */
  /** Pour le propriétaire : son statut, en pastille sur la photo (décision 2026-11-21-statut-a-la-place-du-coeur). */
  status: { value: string; label: string; tone: string } | null;
  /** Cœur de favori d'un membre connecté ; `null` : pas de cœur (visiteur, sa propre offre). */
  favorite?: ListItemFavorite | null;
  /** Les avis ; `null` pour une offre non publiée (décision 2026-11-19-contrat-avis-offres). */
  reviews: OfferReviews | null;
  /**
   * Bouton de la barre fixe (décision 2026-11-19-contrat-reservations) : « Réserver »
   * (séjour) ou « Demander une visite », et le formulaire à ouvrir avec l'offre ;
   * `null` (ou absent) : pas de bouton (sa propre offre).
   */
  booking?: { type: 'stay' | 'visit'; label: string; form: string } | null;
  /** Pour son auteur, à la place de la réservation : « Modifier » et le formulaire de l'offre (décision 2026-11-19-fiche-bouton-modifier). */
  edit?: { label: string; form: string } | null;
  /** Pour son auteur, à la place du prix : « Retirer », sa confirmation et l'envoi (décision 2026-11-22-retirer-depuis-la-fiche). */
  delete?: ListItemDelete | null;
};

/**
 * Une section de la fiche, construite par Laravel : `rows` (lignes « libellé —
 * valeur » : caractéristiques, règles), `text` (un texte et une note : la
 * localisation, un bloc d'informations), `reviews` (les avis de `reviews`). Un type
 * inconnu est ignoré.
 */
export type OfferSection = {
  key: string;
  type: 'rows' | 'text' | 'reviews' | string;
  title: string;
  open: boolean;
  rows?: { label: string; value: string }[];
  text?: string;
  note?: string | null;
};

/** Un avis : prénom de l'auteur, note de 1 à 5, commentaire, date. */
export type OfferReview = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string | null;
  /** La date formatée par le serveur (« 18 nov. 2026 »), la même que dans la liste des avis (décision 2026-11-25-dates-formatees-serveur). */
  date?: string | null;
};

/** Le bloc « Avis » de la fiche. */
export type OfferReviews = {
  /** Note moyenne au dixième ; `null` sans avis. */
  average: number | null;
  count: number;
  /** Les 5 derniers, du plus récent au plus ancien. */
  latest: OfferReview[];
  /** Son avis, s'il en a donné un. */
  mine: { rating: number; comment: string } | null;
  /** Peut-il donner un avis (connecté, offre d'un autre) ? */
  can_review: boolean;
  /** Retirer son avis : libellé, confirmation et envoi ; `null` sans avis. */
  delete: ListItemDelete | null;
};

export type OfferDetailResponse = { data: OfferDetail };

/** Un jour du calendrier d'une offre (décision 2026-11-19-contrat-calendrier-offre). */
export type OfferCalendarDay = { date: string; day: number; state: string; dot: string | null };

/** Un mois du calendrier d'une offre, décrit par l'API. */
export type OfferCalendarMonth = {
  /** Titre de la barre du haut (« Calendrier »). */
  title: string;
  /** Titre du contenu : le titre saisi de l'offre (« Studio photos »). */
  heading: string;
  /** Le titre composé (« Location meublée · Studio · Douala »), sous le titre (décision 2026-11-22-calendrier-titre-compose) ; `null` (ou absent) : aucun. */
  composed_title?: string | null;
  /** Son adresse, sous le titre ; `null` sans adresse. */
  address: string | null;
  /** Les indications de l'adresse, dessous (« Portail vert, 2e étage ») ; `null` sans. */
  indication: string | null;
  month: string;
  label: string;
  previous: string | null;
  next: string | null;
  weekdays: string[];
  offset: number;
  days: OfferCalendarDay[];
  legend: { kind: 'day' | 'dot' | string; tone: string; label: string }[];
};

/**
 * Une demande dans le panneau d'un jour, en carte de notification (décision
 * 2026-11-20-calendrier-cartes) : qui demande, la pastille, le texte, le message,
 * le total, et Accepter / Refuser.
 */

/** Le panneau d'un jour : ses demandes en cartes, « Bloquer » ou « Débloquer », ou une note. */
export type OfferCalendarDayPanel = {
  title: string;
  /** Ses demandes, en cartes de « Demandes reçues » (décision 2026-11-22-calendrier-carte-demandes-recues). */
  items: ListItem[];
  empty: string;
  action: ListItemAction | null;
  note: string | null;
};

/** La page publique d'un membre (décision 2026-11-19-page-membre) : jamais ses coordonnées. */
export type MemberProfile = {
  /** Titre de la barre du haut (« Profil »). */
  title: string;
  name: string;
  initials: string;
  photo: string | null;
  /** « Membre depuis mars 2026 ». */
  since: string;
  description: string | null;
  facts: { label: string; value: string }[];
};

/** Un carrousel de l'accueil : une ville et ses offres tirées au hasard (décision 2026-11-23-accueil-carrousels-par-ville). */
/** Un carrousel de l'accueil : une région (décision 2026-11-25-region-de-l-adresse), le filtre qu'ouvre « Voir tout ». */
export type HomeCarousel = {
  title: string;
  filter: Record<string, string>;
  items: ListItem[];
};

/** `GET /api/v1/home` : le bloc « À la une » (décision 2026-11-25-bloc-a-la-une), puis un carrousel par ville. */
export type HomeData = {
  featured: ListItem[];
  carousels: HomeCarousel[];
};
