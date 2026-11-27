import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ProfileListScreen } from '@/features/auth/screens/ProfileListScreen';
import { setFilterValues, useListFilters } from '@/features/list/utils/filters';

import { OFFER_REVIEWS_LIST } from './OfferReviews';

/**
 * Tous les avis d'une offre (décision 2026-11-25-liste-avis-generique) : la liste `offer.reviews` servie par l'API, avec la
 * recherche, l'offre en filtre caché, la note en tête au style du titre de la fiche (décision
 * 2026-11-25-liste-avis-note-style-titre-fiche). Sa page (`/offers/[id]/reviews`) et, sans cadre (`bare`), le panneau
 * « Avis » des étoiles de « Mes réservations » (décision 2026-11-27-reservations-oeil-voir).
 */
export function OfferReviewsList({ offer, bare = false }: { offer: string; bare?: boolean }) {
  const chosen = useListFilters(OFFER_REVIEWS_LIST).values.offer;

  // La fiche choisit l'offre avant d'ouvrir la liste ; sinon, elle est choisie ici, après le rendu.
  useEffect(() => {
    if (chosen !== offer) {
      setFilterValues(OFFER_REVIEWS_LIST, { offer });
    }
  }, [chosen, offer]);

  // Dans un panneau, rien avant que l'offre soit choisie : pas les avis d'une autre.
  if (bare && chosen !== offer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="offer-reviews-loading" />
      </View>
    );
  }

  return <ProfileListScreen key={offer} list={OFFER_REVIEWS_LIST} headingType="subtitle" bare={bare} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
