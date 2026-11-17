import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';

import { AppTopBar } from '@/features/welcome/components/AppTopBar';
import { useI18n } from '@/shared/i18n/I18nContext';

/**
 * Pour un utilisateur connecté : barre fixe en haut (logo de l'application) et
 * menu fixe en bas, Accueil (écran par défaut) et Profil. Icônes seules ; leur
 * nom, servi par l'API, est annoncé aux lecteurs d'écran. Le menu reste visible sur les formulaires du profil (pile `profile/`).
 */
export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs screenOptions={{ header: () => <AppTopBar />, tabBarShowLabel: false }}>
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
