import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCountry } from '@/features/country/context/CountryContext';
import { CountryProvider } from '@/features/country/providers/CountryProvider';
import { EntryScreen } from '@/features/country/screens/EntryScreen';
import { AuthProvider } from '@/features/auth/providers/AuthProvider';
import { ConnectivityGate } from '@/shared/components/ConnectivityGate';
import { bindQueriesToNetwork, useIsOnline } from '@/shared/network/connectivity';

/**
 * Écran de départ de la pile racine pour un invité : l'accueil. Connecté, l'accueil
 * est protégé et la pile part du menu (`(tabs)`).
 */
export const unstable_settings = { anchor: 'welcome' };

SplashScreen.preventAutoHideAsync();
bindQueriesToNetwork();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CountryProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootNavigator />
          </ThemeProvider>
        </CountryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Avant tout, l'écran d'entrée tant qu'aucun pays n'est choisi (décisions
 * 2026-11-18-espace-pays et 2026-11-18-ecran-entree-toujours). Puis les écrans
 * accessibles selon l'état de connexion. L'écran de démarrage (sans texte)
 * reste affiché pendant le chargement. L'écran courant ne s'affiche que si l'app
 * peut fonctionner : sans internet, à tout moment, ou si le démarrage a échoué,
 * l'écran hors ligne le recouvre (décision 2026-11-16-ecran-hors-ligne-permanent).
 */
function RootNavigator() {
  const { isLoading: authLoading, offline: failedToStart, isRetrying, retry, user } = useAuth();
  const country = useCountry();
  const isLoading = authLoading || !country.ready;
  const offline = !useIsOnline() || failedToStart || country.failed;

  useEffect(() => {
    if (!isLoading || offline) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, offline]);

  const retryAll = () => {
    retry();
    country.retry();
  };

  return (
    <ConnectivityGate offline={offline} onRetry={retryAll} retrying={isRetrying}>
      {/* Pas encore entré dans un pays : l'écran d'entrée (décision 2026-11-18-ecran-entree-toujours). */}
      {!isLoading && country.country === null && <EntryScreen showLanguage={user === null} />}
      {!isLoading && country.country !== null && (
        <Stack screenOptions={{ headerShown: false }}>
          {/* Fiche d'une offre : pour un visiteur comme pour un membre (décision 2026-11-18-fiche-offre). */}
          <Stack.Screen name="offers/[id]/index" />
          {/* Tous les avis d'une offre, ouverts comme la fiche (décision 2026-11-19-nuit-tous-les-avis). */}
          <Stack.Screen name="offers/[id]/reviews" />
          {/* Les filtres d'une liste (décision 2026-11-19-contrat-filtres-vitrine). */}
          <Stack.Screen name="filters/[list]" />
          <Stack.Protected guard={user !== null}>
            <Stack.Screen name="(tabs)" />
            {/* Un formulaire du profil, par-dessus les onglets (décision 2026-11-19-contrat-bouton-fixe-formulaires). */}
            <Stack.Screen name="profile/[form]" />
            {/* Son avis sur une offre, ouvert depuis la fiche (décision 2026-11-19-contrat-avis-offres). */}
            <Stack.Screen name="offers/[id]/review" />
          </Stack.Protected>
          {/* Invité : l'accueil d'abord (ancre de la pile), d'où partent la connexion et l'inscription. */}
          <Stack.Protected guard={user === null}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="sign-up" />
            <Stack.Screen name="forgot-password" />
          </Stack.Protected>
        </Stack>
      )}
    </ConnectivityGate>
  );
}
