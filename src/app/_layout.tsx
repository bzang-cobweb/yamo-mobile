import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthProvider } from '@/features/auth/providers/AuthProvider';
import { ConnectivityGate } from '@/shared/components/ConnectivityGate';
import { bindQueriesToNetwork, useIsOnline } from '@/shared/network/connectivity';

SplashScreen.preventAutoHideAsync();
bindQueriesToNetwork();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Écrans accessibles selon l'état de connexion. L'écran de démarrage (sans texte)
 * reste affiché pendant le chargement. L'écran courant ne s'affiche que si l'app
 * peut fonctionner : sans internet, à tout moment, ou si le démarrage a échoué,
 * l'écran hors ligne le recouvre (décision 2026-11-16-ecran-hors-ligne-permanent).
 */
function RootNavigator() {
  const { isLoading, offline: failedToStart, isRetrying, retry, user } = useAuth();
  const offline = !useIsOnline() || failedToStart;

  useEffect(() => {
    if (!isLoading || offline) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, offline]);

  return (
    <ConnectivityGate offline={offline} onRetry={retry} retrying={isRetrying}>
      {!isLoading && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={user !== null}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={user === null}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      )}
    </ConnectivityGate>
  );
}
