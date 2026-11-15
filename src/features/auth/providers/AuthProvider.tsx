import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocales } from 'expo-localization';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { apiClient } from '@/shared/api/ApiClient';
import { ApiError } from '@/shared/api/errors';
import { pickBestLocale, translate } from '@/shared/i18n/locale';
import { APP_LOCALES, DEFAULT_LOCALE } from '@/shared/i18n/messages';
import { localeService } from '@/shared/services/LocaleService';

import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/AuthService';
import type { AuthContextValue, LoginCredentials, User } from '../types';
import { deviceName } from '../utils/device-name';
import { clearToken, readToken, saveToken } from '../utils/token-storage';

const ME_KEY = ['auth', 'me'] as const;

/**
 * Session de l'app : jeton (stockage chiffré), utilisateur connecté, et langue
 * — celle du compte, sinon la meilleure langue de l'appareil parmi celles que
 * l'API propose.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  // undefined : pas encore lu ; null : aucun jeton.
  const [token, setToken] = useState<string | null | undefined>(undefined);

  const applyToken = useCallback((value: string | null) => {
    apiClient.setToken(value);
    setToken(value);
  }, []);

  useEffect(() => {
    readToken().then(applyToken, () => applyToken(null));
  }, [applyToken]);

  // Langues proposées par l'API ; injoignable → les langues de l'app.
  const localesQuery = useQuery({
    queryKey: ['locales'],
    queryFn: () => localeService.list(),
    staleTime: Infinity,
    retry: 1,
  });
  const available = localesQuery.data?.data.map((locale) => locale.code) ?? [...APP_LOCALES];
  const deviceLocales = useLocales().map((locale) => locale.languageTag);
  const deviceLocale = pickBestLocale(deviceLocales, available, localesQuery.data?.default ?? DEFAULT_LOCALE);

  const meQuery = useQuery({
    queryKey: [...ME_KEY, token],
    queryFn: () => authService.me(),
    enabled: typeof token === 'string',
    retry: (failureCount, error) => !(error instanceof ApiError && error.rejectsToken) && failureCount < 2,
  });

  // Jeton révoqué, expiré ou refusé : on l'oublie, l'app revient à la connexion.
  useEffect(() => {
    if (meQuery.error instanceof ApiError && meQuery.error.rejectsToken) {
      clearToken().finally(() => applyToken(null));
    }
  }, [applyToken, meQuery.error]);

  const user = typeof token === 'string' ? (meQuery.data ?? null) : null;
  const locale = user?.locale ?? deviceLocale;

  // Langue des requêtes : messages et formulaires de l'API dans la langue de l'app.
  apiClient.setLocale(locale);

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      const { user: signedIn, token: newToken } = await authService.login(credentials, deviceName());
      await saveToken(newToken);
      queryClient.setQueryData([...ME_KEY, newToken], signedIn);
      applyToken(newToken);
    },
    [applyToken, queryClient],
  );

  const signOut = useCallback(async () => {
    if (typeof token === 'string') {
      // La révocation côté serveur est souhaitée, pas nécessaire : le jeton local est oublié quoi qu'il arrive.
      await authService.logout().catch(() => undefined);
    }
    await clearToken();
    queryClient.removeQueries({ queryKey: ME_KEY });
    applyToken(null);
  }, [applyToken, queryClient, token]);

  const setUser = useCallback(
    (updated: User) => queryClient.setQueryData([...ME_KEY, token], updated),
    [queryClient, token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: token === undefined || localesQuery.isPending || (typeof token === 'string' && meQuery.isPending),
      user,
      locale,
      t: (key, params) => translate(locale, key, params),
      signIn,
      signOut,
      setUser,
    }),
    [locale, localesQuery.isPending, meQuery.isPending, setUser, signIn, signOut, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
