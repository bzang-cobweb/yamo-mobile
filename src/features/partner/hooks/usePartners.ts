import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { partnerService } from '../services/PartnerService';

/** Les partenaires de l'accueil (décision 2026-11-23-module-partenaires). */
export function usePartners() {
  const { locale } = useI18n();

  return useQuery({ queryKey: ['partners', locale], queryFn: () => partnerService.list() });
}
