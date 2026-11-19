import { useSegments } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';

import { AppTopBar } from '@/features/welcome/components/AppTopBar';
import { useI18n } from '@/shared/i18n/I18nContext';
import { useTheme } from '@/shared/theme/hooks/use-theme';

/**
 * Pour un utilisateur connecté : barre fixe en haut (logo de l'application) sur
 * l'écran racine de chaque onglet, pas sur les formulaires du profil ; menu fixe en bas, Accueil (écran par défaut) et
 * Profil. Icônes seules ; leur nom, servi par l'API, est annoncé aux lecteurs
 * d'écran. Le menu est masqué sur les formulaires du profil (décision
 * 2026-11-19-contrat-bouton-fixe-formulaires) ; il reste sur les listes.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const theme = useTheme();
  // `(tabs)/profile/[form]` : un formulaire du profil, sans barre du haut ; il
  // affiche son propre en-tête avec le bouton retour.
  const segments = useSegments();
  const inSubPage = segments.length > 2;
  // Un formulaire du profil (`profile/[form]`) : pas de menu du bas, son bouton d'envoi
  // est fixé à sa place (décision 2026-11-19-contrat-bouton-fixe-formulaires). Les listes le gardent.
  const inForm = segments[1] === 'profile' && segments[2] === '[form]';

  return (
    <Tabs
      screenOptions={{
        header: () => <AppTopBar />,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.primary,
        // La zone de contenu reste sur le fond du thème (blanc), pas le gris de la navigation
        // (décision 2026-11-19-fond-blanc-filtres).
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={{ ios: focused ? 'house.fill' : 'house', android: 'home', web: 'home' }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarButtonTestID: 'tab-profile',
          // Toucher l'onglet Profil depuis un formulaire revient au profil.
          popToTopOnBlur: true,
          headerShown: !inSubPage,
          tabBarStyle: inForm ? { display: 'none' } : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={{ ios: focused ? 'person.fill' : 'person', android: 'person', web: 'person' }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
