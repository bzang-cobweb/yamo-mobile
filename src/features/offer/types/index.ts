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
  photos: string[];
  description: string | null;
  /** Caractéristiques lisibles, dans l'ordre. */
  facts: { label: string; value: string }[];
  published_at: string | null;
  /** Statut, servi au seul propriétaire. */
  status: { value: string; label: string } | null;
};

export type OfferDetailResponse = { data: OfferDetail };
