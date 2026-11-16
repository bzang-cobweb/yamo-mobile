import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocales } from 'expo-localization';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { apiClient } from '@/shared/api/ApiClient';
import { ApiError, NetworkError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { pickBestLocale, translate } from '@/shared/i18n/locale';
import { APP_LOCALES, DEFAULT_LOCALE } from '@/shared/i18n/messages';
import { localeService } from '@/shared/services/LocaleService';
import { messageService } from '@/shared/services/MessageService';

import { AuthContext } from '../context/AuthContext';
import { loginService } from '../services/LoginService';
import { logoutService } from '../services/LogoutService';
import { profileService } from '../services/ProfileService';
import type { AuthContextValue, LoginCredentials, User } from '../types';
import { deviceName } from '../utils/device-name';
import { clearToken, readToken, saveToken } from '../utils/token-storage';

const ME_KEY = ['auth', 'me'] as const;

/** Sans réseau, on n'insiste pas : l'écran hors ligne s'affiche tout de suite. */
function retryUnlessOffline(failureCount: number, error: Error): boolean {
  return !(error instanceof NetworkError) && failureCount < 1;
}

/**
 * Chargement de démarrage impossible : pas de réseau, ou serveur qui ne répond pas
 * comme l'API (arrêté derrière un proxy, erreur 5xx…). Sans ces données, l'app n'a
 * pas ses textes : seul l'écran hors ligne local peut s'afficher. Un jeton refusé
 * n'en est pas un : l'app revient à la connexion.
 */
function failedToLoad(query: { data: unknown; error: Error | null }): boolean {
  return query.data === undefined && query.error !== null && !(query.error instanceof ApiError && query.error.rejectsToken);
}

/**
 * Session de l'app : jeton (stockage chiffré), utilisateur connecté, langue —
 * celle du compte, sinon la meilleure langue de l'appareil parmi celles que l'API
 * propose — et textes de l'interface servis par l'API dans cette langue.
 * Démarrage impossible (pas de réseau, serveur injoignable) : `offline`, l'app
 * affiche l'écran hors ligne local.
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
    retry: retryUnlessOffline,
  });
  const available = localesQuery.data?.data.map((locale) => locale.code) ?? [...APP_LOCALES];
  const deviceLocales = useLocales().map((locale) => locale.languageTag);
  const deviceLocale = pickBestLocale(deviceLocales, available, localesQuery.data?.default ?? DEFAULT_LOCALE);

  const meQuery = useQuery({
    queryKey: [...ME_KEY, token],
    queryFn: () => profileService.get(),
    enabled: typeof token === 'string',
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.rejectsToken) && !(error instanceof NetworkError) && failureCount < 2,
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

  // Textes de l'interface, une fois la langue connue. Pendant un changement de
  // langue, les textes précédents restent affichés : la navigation n'est pas démontée.
  const localeKnown = token !== undefined && !localesQuery.isPending && !(typeof token === 'string' && meQuery.isPending);
  const messagesQuery = useQuery({
    queryKey: ['messages', locale],
    queryFn: () => messageService.get(),
    enabled: localeKnown,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    retry: retryUnlessOffline,
  });
  const messages = messagesQuery.data?.messages;

  const offline = failedToLoad(localesQuery) || (typeof token === 'string' && failedToLoad(meQuery)) || failedToLoad(messagesQuery);
  const isRetrying = localesQuery.isFetching || meQuery.isFetching || messagesQuery.isFetching;

  const retry = useCallback(() => {
    localesQuery.refetch();
    if (typeof token === 'string') {
      meQuery.refetch();
    }
    messagesQuery.refetch();
  }, [localesQuery, meQuery, messagesQuery, token]);

  const signIn = useCallback(
    async (credentials: LoginCredentials) => {
      const { user: signedIn, token: newToken } = await loginService.login(credentials, deviceName());
      await saveToken(newToken);
      queryClient.setQueryData([...ME_KEY, newToken], signedIn);
      applyToken(newToken);
    },
    [applyToken, queryClient],
  );

  const signOut = useCallback(async () => {
    if (typeof token === 'string') {
      // La révocation côté serveur est souhaitée, pas nécessaire : le jeton local est oublié quoi qu'il arrive.
      await logoutService.logout().catch(() => undefined);
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
      isLoading: !localeKnown || messagesQuery.isPending,
      offline,
      isRetrying,
      retry,
      user,
      locale,
      t: (key, params) => translate(messages ?? {}, locale, key, params),
      signIn,
      signOut,
      setUser,
    }),
    [isRetrying, locale, localeKnown, messages, messagesQuery.isPending, offline, retry, setUser, signIn, signOut, user],
  );

  const i18n = useMemo(() => ({ locale: value.locale, t: value.t }), [value.locale, value.t]);

  return (
    <AuthContext.Provider value={value}>
      <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
    </AuthContext.Provider>
  );
}
