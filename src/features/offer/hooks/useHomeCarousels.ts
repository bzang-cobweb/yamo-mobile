import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';
import type { HomeData } from '../types';

/** L'accueil, une seule requête pour le bloc « À la une » et les carrousels. */
function useHome<T>(select: (data: HomeData) => T) {
  const { locale } = useI18n();

  return useQuery({ queryKey: ['home-carousels', locale], queryFn: () => offerService.home(), select });
}

/** Les carrousels de l'accueil, un par ville (décision 2026-11-23-accueil-carrousels-par-ville). */
export function useHomeCarousels() {
  return useHome((data) => data.carousels);
}

/** Le bloc « À la une » de l'accueil (décision 2026-11-25-bloc-a-la-une). */
export function useHomeFeatured() {
  return useHome((data) => data.featured);
}
