import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { formService } from '../services/FormService';

/**
 * Définition d'un formulaire, rechargée quand la langue de l'app change (les
 * libellés arrivent traduits de l'API).
 */
export function useFormDefinition(name: string) {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['form', name, locale],
    queryFn: () => formService.get(name),
  });
}
