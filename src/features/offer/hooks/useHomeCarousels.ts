import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';

/** Les carrousels de l'accueil, un par ville (décision 2026-11-23-accueil-carrousels-par-ville). */
export function useHomeCarousels() {
  const { locale } = useI18n();

  return useQuery({ queryKey: ['home-carousels', locale], queryFn: () => offerService.home() });
}
