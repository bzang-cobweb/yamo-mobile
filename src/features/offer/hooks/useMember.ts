import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { offerService } from '../services/OfferService';

/** La page publique d'un membre (décision 2026-11-19-page-membre). */
export function useMember(id: string) {
  const { locale } = useI18n();

  return useQuery({ queryKey: ['member', id, locale], queryFn: () => offerService.member(id) });
}
