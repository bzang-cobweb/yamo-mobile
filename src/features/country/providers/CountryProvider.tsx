import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { apiClient } from '@/shared/api/ApiClient';
import { NetworkError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';

import { CountryContext, type CountryContextValue } from '../context/CountryContext';
import { countryService } from '../services/CountryService';
import { readChosenCountry, saveChosenCountry } from '../utils/country-storage';

/**
 * Pays courant, l'espace de l'app (décisions 2026-11-18-espace-pays,
 * 2026-11-18-ecran-entree-toujours et 2026-11-18-ecran-entree-selecteurs).
 * L'écran d'entrée s'affiche tant que le pays et la langue ne sont pas choisis ;
 * ensuite on entre directement, si le pays gardé est toujours ouvert. Le pays est envoyé à chaque requête
 * (`X-Country`) ; en changer recharge toutes les données, sans déconnexion.
 */
export function CountryProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { locale, localeChosen } = useI18n();
  // undefined : pas encore lu ; null : aucun.
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const [entryOpen, setEntryOpen] = useState(false);

  useEffect(() => {
    readChosenCountry().then(setChosen, () => setChosen(null));
  }, []);

  const query = useQuery({
    queryKey: ['countries', locale],
    queryFn: () => countryService.list(),
    staleTime: Infinity,
    // Changement de langue : la liste précédente reste affichée, l'écran d'entrée
    // n'est pas démonté et garde le pays touché.
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => !(error instanceof NetworkError) && failureCount < 2,
  });
  const countries = useMemo(() => query.data ?? [], [query.data]);
  const current = chosen ? (countries.find((country) => country.code === chosen) ?? null) : null;

  // L'API reçoit le pays courant, ou aucun tant qu'on n'est pas entré.
  apiClient.setCountry(current?.code ?? null);

  const enter = useCallback(
    (code: string) => {
      const changed = code !== chosen;
      apiClient.setCountry(code);
      setChosen(code);
      setEntryOpen(false);
      saveChosenCountry(code).catch(() => undefined);

      if (changed) {
        // Un autre espace : listes, formulaires et menu rechargés.
        queryClient.invalidateQueries({ predicate: (cached) => cached.queryKey[0] !== 'countries' });
      }
    },
    [chosen, queryClient],
  );

  const refetch = query.refetch;
  const value = useMemo<CountryContextValue>(
    () => ({
      ready: chosen !== undefined && (query.isSuccess || query.isError),
      failed: query.isError && !query.isFetching,
      retry: () => void refetch(),
      countries,
      // L'écran d'entrée ne s'affiche plus quand pays et langue sont déjà choisis.
      country: entryOpen || !localeChosen ? null : current,
      enter,
      reopen: () => setEntryOpen(true),
      canChange: countries.length > 1,
    }),
    [chosen, countries, current, enter, entryOpen, localeChosen, query.isError, query.isFetching, query.isSuccess, refetch],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}
