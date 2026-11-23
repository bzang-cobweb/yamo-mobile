import { usePathname, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { SymbolView } from 'expo-symbols';

import { clearFilters } from '@/features/list/utils/filters';
import { useUnreadCount } from '@/features/notification/hooks/useNotifications';
import { NOTIFICATIONS_FILTERS } from '@/features/notification/screens/NotificationsScreen';
import { AppTopBar } from '@/features/welcome/components/AppTopBar';
import { useI18n } from '@/shared/i18n/I18nContext';
import { useTheme } from '@/shared/theme/hooks/use-theme';

/**
 * Pour un utilisateur connecté : barre fixe en haut (logo de l'application) sur
 * l'écran racine de chaque onglet, pas sur les formulaires du profil ; menu fixe en bas, Accueil (écran par défaut),
 * Recherche, Notifications (avec la pastille des non lues) et Profil. Icônes seules ; leur nom, servi par l'API, est annoncé aux lecteurs
 * d'écran. Les formulaires du profil (`app/profile/[form].tsx`) s'ouvrent hors des
 * onglets, par-dessus ; les listes du profil gardent le menu.
 */
export default function TabsLayout() {
  const { t } = useI18n();
  const theme = useTheme();
  // `(tabs)/profile/lists/[list]` : une liste du profil, sans barre du haut ; elle
  // affiche son propre en-tête avec le bouton retour.
  const segments = useSegments();
  const inSubPage = segments.length > 2;
  // Le nombre de non lues, redemandé à chaque changement d'écran (retour sur un onglet, d'une liste…).
  const pathname = usePathname();
  const unreadQuery = useUnreadCount();
  const unread = unreadQuery.data ?? 0;
  const { refetch: refetchUnread } = unreadQuery;

  useEffect(() => {
    void refetchUnread();
  }, [pathname, refetchUnread]);

  // L'app revenue au premier plan : la pastille aussi.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refetchUnread();
      }
    });

    return () => subscription.remove();
  }, [refetchUnread]);

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
      {/* Recherche, avant les notifications : les offres, leur recherche et leurs filtres (décision
          2026-11-23-onglet-recherche). */}
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarAccessibilityLabel: t('tabs.search'),
          tabBarButtonTestID: 'tab-search',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} tintColor={color} size={size} />
          ),
        }}
      />
      {/* Notifications, entre Accueil et Profil : une pastille (un point, sans nombre) dès qu'il y a
          des non lues (décisions 2026-11-19-contrat-centre-notifications et 2026-11-19-pastille-point). */}
      <Tabs.Screen
        name="notifications"
        // Toucher l'onglet enlève tous les filtres des notifications (décision 2026-11-21-onglet-notifications-sans-filtres) ;
        // un compteur qui ouvre les notifications déjà filtrées ne passe pas par là.
        listeners={{ tabPress: () => clearFilters(NOTIFICATIONS_FILTERS) }}
        options={{
          title: t('tabs.notifications'),
          tabBarAccessibilityLabel: unread > 0 ? `${t('tabs.notifications')}, ${t('notifications.unread')}` : t('tabs.notifications'),
          tabBarButtonTestID: 'tab-notifications',
          // Le point chevauche le coin haut droit de la cloche, comme une pastille sans chiffre.
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <SymbolView
                name={{ ios: focused ? 'bell.fill' : 'bell', android: 'notifications', web: 'notifications' }}
                tintColor={color}
                size={size}
              />
              {unread > 0 && (
                <View
                  testID="tab-notifications-dot"
                  style={[styles.dot, { backgroundColor: theme.primary, borderColor: theme.background }]}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarButtonTestID: 'tab-profile',
          // Toucher l'onglet Profil depuis une liste revient au profil.
          popToTopOnBlur: true,
          headerShown: !inSubPage,
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

const styles = StyleSheet.create({
  // Un point de 10, bordé du fond pour se détacher de la cloche.
  dot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
});
