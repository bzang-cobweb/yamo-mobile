import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { deviceLocale, translate, type Locale, type MessageKey } from '@/i18n';
import * as api from '@/lib/api';
import { clearToken, readToken, saveToken } from '@/lib/token-storage';

type AuthContextValue = {
  /** `true` tant que le jeton enregistré et l'utilisateur ne sont pas chargés. */
  isLoading: boolean;
  user: api.User | null;
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string>) => string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ME_KEY = ['auth', 'me'] as const;

/** 401 (jeton inconnu ou révoqué) ou 403 (compte refusé par la policy) : le jeton ne sert plus. */
function isRejectedToken(error: unknown): boolean {
  return error instanceof api.ApiError && (error.status === 401 || error.status === 403);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  // undefined : pas encore lu ; null : aucun jeton.
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    readToken().then(setToken, () => setToken(null));
  }, []);

  const fallbackLocale = deviceLocale();

  const meQuery = useQuery({
    queryKey: [...ME_KEY, token],
    queryFn: () => api.me(token as string, fallbackLocale),
    enabled: typeof token === 'string',
    retry: (failureCount, error) => !isRejectedToken(error) && failureCount < 2,
  });

  // Jeton révoqué, expiré ou refusé : on l'oublie, l'app revient à la connexion.
  useEffect(() => {
    if (isRejectedToken(meQuery.error)) {
      clearToken().finally(() => setToken(null));
    }
  }, [meQuery.error]);

  const user = typeof token === 'string' ? (meQuery.data ?? null) : null;
  const locale = user?.locale ?? fallbackLocale;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await api.login(
        { email, password, deviceName: Device.deviceName ?? Device.modelName ?? 'yamo-mobile' },
        locale,
      );
      await saveToken(response.token);
      queryClient.setQueryData([...ME_KEY, response.token], response.data);
      setToken(response.token);
    },
    [locale, queryClient],
  );

  const signOut = useCallback(async () => {
    if (typeof token === 'string') {
      // La révocation côté serveur est souhaitée, pas nécessaire : le jeton local est oublié quoi qu'il arrive.
      await api.logout(token, locale).catch(() => undefined);
    }
    await clearToken();
    queryClient.removeQueries({ queryKey: ME_KEY });
    setToken(null);
  }, [locale, queryClient, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading: token === undefined || (typeof token === 'string' && meQuery.isPending),
      user,
      locale,
      t: (key, params) => translate(locale, key, params),
      signIn,
      signOut,
    }),
    [locale, meQuery.isPending, signIn, signOut, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth doit être utilisé sous <AuthProvider>.');
  }

  return value;
}
