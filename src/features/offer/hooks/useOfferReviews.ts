import { useInfiniteQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';
import type { OfferReviewPage } from '../types';

/** Tous les avis d'une offre, page après page (décision 2026-11-19-nuit-tous-les-avis). */
export function useOfferReviews(id: string) {
  const { locale } = useI18n();

  return useInfiniteQuery({
    queryKey: ['offer-reviews', id, locale],
    queryFn: ({ pageParam }) => offerService.reviews(id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: OfferReviewPage) => last.next_cursor ?? undefined,
  });
}
