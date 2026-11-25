import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useI18n } from '@/shared/i18n/I18nContext';

import { partnerService } from '../services/PartnerService';

/**
 * Les partenaires de l'accueil, tirés au hasard (décision 2026-11-23-module-partenaires), et la carte « Devenir
 * partenaire », qui change avec le compte : se connecter ou se déconnecter la recharge.
 */
export function usePartners() {
  const { locale } = useI18n();
  const { user } = useAuth();

  return useQuery({ queryKey: ['partners', locale, user?.id ?? null], queryFn: () => partnerService.list() });
}

/** Un partenaire, pour sa page (décision 2026-11-23-partenaires-liste-detail). */
export function usePartner(id: string) {
  const { locale } = useI18n();

  return useQuery({ queryKey: ['partner', id, locale], queryFn: () => partnerService.get(id) });
}
