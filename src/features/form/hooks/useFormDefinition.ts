import { useQuery } from '@tanstack/react-query';

import { useI18n } from '@/shared/i18n/I18nContext';

import { formService } from '../services/FormService';

/**
 * Définition d'un formulaire, rechargée quand la langue de l'app change (les
 * libellés arrivent traduits de l'API).
 *
 * Pas gardée en mémoire une fois le formulaire fermé (`gcTime: 0`) : ses valeurs
 * par défaut sont celles du compte, et le formulaire les reprend à l'affichage.
 * Rouvert après un enregistrement, il doit montrer les nouvelles valeurs, pas
 * celles d'avant.
 */
export function useFormDefinition(name: string) {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['form', name, locale],
    queryFn: () => formService.get(name),
    gcTime: 0,
  });
}
