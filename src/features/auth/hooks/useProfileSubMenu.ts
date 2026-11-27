import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { profileMenuService } from '../services/ProfileMenuService';
import { useAuth } from './useAuth';

/** Un sous-menu du profil. Rechargé quand la langue, l'e-mail ou le numéro change (libellés « Ajouter », « Changer »). */
export function useProfileSubMenu(menu: string) {
  const { locale } = useI18n();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile-menu', menu, locale, user?.id, user?.email, user?.phone],
    queryFn: () => profileMenuService.submenu(menu),
    enabled: user !== null,
  });
}
