import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { applicationService } from '../services/ApplicationService';

/** Présentation de l'application, rechargée quand la langue de l'app change. */
export function useApplication() {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['application', locale],
    queryFn: () => applicationService.get(),
  });
}
