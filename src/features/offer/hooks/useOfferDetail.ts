import { useQuery } from '@tanstack/react-query';

import { ApiError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';

/** La fiche d'une offre, rechargée quand la langue change ; une offre introuvable n'est pas redemandée. */
export function useOfferDetail(id: string) {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['offer', id, locale],
    queryFn: () => offerService.get(id),
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
}
