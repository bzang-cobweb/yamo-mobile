import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApplication } from '@/features/welcome/hooks/useApplication';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { AvatarPicker } from '../components/AvatarPicker';
import { DeleteAccountLink } from '../components/DeleteAccountLink';
import { ProfileMenuLink } from '../components/ProfileMenuLink';
import { SignOutButton } from '../components/SignOutButton';
import { useAuth } from '../hooks/useAuth';
import { useProfileMenu } from '../hooks/useProfileMenu';
import type { ProfileNotice } from './ProfileFormScreen';

/**
 * Seule une route interne de l'app (`/…`) est suivie : une adresse servie par
 * erreur ou détournée n'ouvre rien, et une entrée sans route (réponse d'un
 * serveur plus ancien, mise en cache) est ignorée au lieu de faire planter l'écran.
 */
function isAppRoute(path: unknown): path is Href & string {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
}

/**
 * Profil (onglet), sans titre : photo modifiable, nom complet, e-mail et
 * téléphone (format international) selon les canaux de l'application, menu de
 * ses formulaires, déconnexion, suppression du compte. Le menu (liens, ordre,
 * libellés, routes) est servi par l'API, qui le définit ; il se recharge à
 * chaque retour sur le profil. Un formulaire enregistré revient ici avec
 * `notice`, qui affiche une confirmation.
 */
export function ProfileScreen() {
  const { user, t } = useAuth();
  // Canaux de compte de l'application ; tant qu'ils ne sont pas connus, les deux.
  const channels = useApplication().data?.channels ?? { email: true, phone: true };
  const menu = useProfileMenu();
  const { refetch } = menu;
  const hasUser = user !== null;
  const { notice } = useLocalSearchParams<{ notice?: ProfileNotice }>();
  const notices = {
    saved: t('profile.saved'),
    password: t('profile.passwordSaved'),
    email: t('profile.emailSaved'),
    phone: t('profile.phoneSaved'),
  } as const;
  const message = notice && notice in notices ? notices[notice] : null;

  // En revenant sur le profil, le menu se recharge ; en le quittant (vers un
  // formulaire, un autre onglet), la confirmation s'efface.
  useFocusEffect(
    useCallback(() => {
      if (hasUser) {
        void refetch();
      }

      return () => router.setParams({ notice: undefined });
    }, [hasUser, refetch]),
  );

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <AvatarPicker />
          <View style={styles.identity}>
            <ThemedText type="smallBold" testID="profile-full-name">
              {user.full_name}
            </ThemedText>
            {channels.email && user.email && (
              <ThemedText themeColor="textSecondary" testID="profile-email">
                {user.email}
              </ThemedText>
            )}
            {channels.phone && user.phone && (
              <ThemedText themeColor="textSecondary" testID="profile-phone">
                {user.phone_international ?? user.phone}
              </ThemedText>
            )}
          </View>
          {message && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityRole="alert" testID="profile-notice">
              {message}
            </ThemedText>
          )}
          <View style={styles.links}>
            {(menu.data ?? []).map(({ key, label, path }) =>
              isAppRoute(path) ? (
                <ProfileMenuLink key={key} href={path} label={label} testID={`profile-link-${key}`} />
              ) : null,
            )}
          </View>
          <SignOutButton />
          <DeleteAccountLink />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    alignItems: 'stretch',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  identity: { alignItems: 'center', gap: Spacing.one },
  links: { gap: Spacing.two },
});
