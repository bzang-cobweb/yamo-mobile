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
import type { ProfileMenuKey } from '../types';
import type { ProfileNotice } from './ProfileFormScreen';

/** Écran ouvert par chaque lien du menu ; une clé absente d'ici est ignorée. */
const MENU_ROUTES: Record<ProfileMenuKey, Href> = {
  personal: '/profile/personal',
  email: '/profile/email',
  phone: '/profile/phone',
  password: '/profile/password',
  preferences: '/profile/preferences',
};

function isMenuKey(key: string): key is ProfileMenuKey {
  return Object.hasOwn(MENU_ROUTES, key);
}

/**
 * Profil (onglet), sans titre : photo modifiable, nom complet, e-mail et
 * téléphone (format international) selon les canaux de l'application, menu de
 * ses formulaires, déconnexion, suppression du compte. Le menu (liens, ordre,
 * libellés) est servi par l'API et réglé dans le back-office ; il se recharge à
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
            {(menu.data ?? []).map(({ key, label }) =>
              isMenuKey(key) ? (
                <ProfileMenuLink key={key} href={MENU_ROUTES[key]} label={label} testID={`profile-link-${key}`} />
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
