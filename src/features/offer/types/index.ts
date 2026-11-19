import type { ListItemDelete, ListItemFavorite } from '@/features/list/types';

/**
 * La fiche d'une offre, décrite par l'API (`GET /api/v1/offers/{id}`, décision
 * 2026-11-18-fiche-offre) : l'app l'affiche sans connaître le domaine.
 */
export type OfferDetail = {
  id: string;
  title: string;
  /** Prix formaté et son libellé (« Loyer mensuel ») ; `null` sans prix. */
  price: { label: string; value: string } | null;
  /** La ville ; jamais la rue. */
  location: string | null;
  /** Indications sur l'adresse écrites par le propriétaire (décision 2026-11-19-description-adresse-offre) ; `null` (ou absent) : aucune. */
  address_description?: string | null;
  photos: string[];
  description: string | null;
  /** Caractéristiques lisibles, dans l'ordre. */
  facts: { label: string; value: string }[];
  published_at: string | null;
  /** Statut, servi au seul propriétaire. */
  status: { value: string; label: string } | null;
  /** Cœur de favori d'un membre connecté ; `null` : pas de cœur (visiteur, sa propre offre). */
  favorite?: ListItemFavorite | null;
  /** Les avis ; `null` pour une offre non publiée (décision 2026-11-19-contrat-avis-offres). */
  reviews: OfferReviews | null;
};

/** Un avis : prénom de l'auteur, note de 1 à 5, commentaire, date. */
export type OfferReview = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string | null;
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
