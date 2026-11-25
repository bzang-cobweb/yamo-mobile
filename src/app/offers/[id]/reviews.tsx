// Route `/offers/[id]/reviews` : tous les avis d'une offre, ouverts depuis la fiche, en liste comme « Mes logements »,
// avec la recherche (décision 2026-11-25-liste-avis-generique) : la liste `offer.reviews` servie par l'API, l'offre en
// filtre caché ; la flèche seule, sans croix.
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { ProfileListScreen } from '@/features/auth/screens/ProfileListScreen';
import { setFilterValues, useListFilters } from '@/features/list/utils/filters';
import { OFFER_REVIEWS_LIST } from '@/features/offer/components/OfferReviews';

export default function OfferReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const offer = String(id);
  const chosen = useListFilters(OFFER_REVIEWS_LIST).values.offer;

  // La fiche choisit l'offre avant d'ouvrir la liste ; un lien direct la choisit ici, après le rendu.
  useEffect(() => {
    if (chosen !== offer) {
      setFilterValues(OFFER_REVIEWS_LIST, { offer });
    }
  }, [chosen, offer]);

  // La note en tête, au style du titre de la fiche (décision 2026-11-25-liste-avis-note-style-titre-fiche).
  return <ProfileListScreen key={offer} list={OFFER_REVIEWS_LIST} headingType="subtitle" />;
}
