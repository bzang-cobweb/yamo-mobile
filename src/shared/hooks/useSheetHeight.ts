import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/shared/theme/theme';

/**
 * La hauteur d'un panneau qui monte du bas (les filtres, les demandes d'un jour du calendrier), ouvert à sa taille
 * maximale par défaut (décision 2026-11-26-panneaux-taille-maximale) : tout l'écran sous la barre d'état, moins une
 * bande du fond assombri, qui reste visible et ferme le panneau au toucher. Calculée sur la fenêtre : un pourcentage
 * se calculerait sur le parent, plus haut que l'écran dans une fenêtre présentée.
 */
export function useSheetHeight(): number {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return height - insets.top - Spacing.four;
}
