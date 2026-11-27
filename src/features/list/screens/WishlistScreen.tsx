import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { ProfileListScreen } from '@/features/auth/screens/ProfileListScreen';

import { setFilterValues, useListFilters } from '../utils/filters';

/** La liste servie par l'API pour les offres d'une liste de favoris ; `wishlist` en est le filtre caché. */
export const WISHLIST_LIST = 'offer.wishlist';

/**
 * Une liste de favoris ouverte (décision 2026-11-27-listes-de-favoris) : l'écran de toute liste du profil, la liste
 * choisie en filtre caché (`wishlist`), posé avant la première requête. Les filtres étant partagés par nom de liste, une
 * autre liste de favoris ouverte entre-temps l'a changé : au retour sur l'écran, il est reposé, et les autres filtres
 * repartent de zéro ; un retour de l'écran des filtres de cette même liste les garde. Le titre (son nom), le menu ⋮
 * (« Renommer », « Supprimer ») et les deux cartes par ligne de « Récemment consultés » sont servis par l'API.
 */
export function WishlistScreen({ id }: { id: string }) {
  const [ready, setReady] = useState(false);
  const chosen = useListFilters(WISHLIST_LIST).values.wishlist;
  const current = useRef(chosen);
  current.current = chosen;

  useFocusEffect(
    useCallback(() => {
      if (current.current !== id) {
        setFilterValues(WISHLIST_LIST, { wishlist: id });
      }
      setReady(true);
    }, [id]),
  );

  return ready ? <ProfileListScreen list={WISHLIST_LIST} /> : null;
}
