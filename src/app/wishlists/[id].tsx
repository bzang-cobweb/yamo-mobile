// Route `/wishlists/[id]` : une liste de favoris ouverte (décision 2026-11-27-listes-de-favoris), depuis « Mes favoris »
// ou le bloc « Récemment consultés » de l'accueil, par le lien servi par l'API. L'écran est celui de toute liste du
// profil (`offer.wishlist`), la liste choisie en filtre caché.
import { useLocalSearchParams } from 'expo-router';

import { WishlistScreen } from '@/features/list/screens/WishlistScreen';

export default function WishlistRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <WishlistScreen key={id} id={id} />;
}
