import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { profileMenuService } from '../services/ProfileMenuService';
import { useAuth } from './useAuth';

/**
 * Menu du profil de l'utilisateur connecté. Rechargé quand la langue change, et
 * quand l'e-mail ou le numéro change (libellé « Ajouter » ou « Changer »).
 */
export function useProfileMenu() {
  const { locale } = useI18n();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile-menu', locale, user?.id, user?.email, user?.phone],
    queryFn: () => profileMenuService.list(),
    enabled: user !== null,
  });
}
