import { useFocusEffect, type Href } from 'expo-router';
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
import type { ProfileMenuItem } from '../types';

/**
 * Un lien sans nom de formulaire ni de liste (réponse d'un serveur plus ancien,
 * mise en cache, ou cible inconnue) est ignoré au lieu de faire planter l'écran.
 */
function isName(name: unknown): name is string {
  return typeof name === 'string' && name !== '';
}

/** Route ouverte par un lien du menu : son formulaire, sinon sa liste. */
function menuHref({ form, list }: ProfileMenuItem): Href | null {
  if (isName(form)) {
    return { pathname: '/profile/[form]', params: { form } };
  }

  return isName(list) ? { pathname: '/profile/lists/[list]', params: { list } } : null;
}

/**
 * Profil (onglet), sans titre : photo modifiable, nom complet, e-mail et
 * téléphone (format international) selon les canaux de l'application, menu de
 * ses formulaires, déconnexion, suppression du compte. Le menu (liens, ordre,
 * libellés, formulaires, listes) est servi par l'API, qui le définit ; chaque
 * lien ouvre `/profile/[form]` ou `/profile/lists/[list]`. Le menu se recharge à chaque retour sur le profil. Un
 * formulaire enregistré revient ici avec le message de confirmation de l'API.
 */
export function ProfileScreen() {
  const { user } = useAuth();
  // Canaux de compte de l'application ; tant qu'ils ne sont pas connus, les deux.
  const channels = useApplication().data?.channels ?? { email: true, phone: true };
  const menu = useProfileMenu();
  const { refetch } = menu;
  const hasUser = user !== null;
  // En revenant sur le profil, le menu se recharge ; la confirmation d'un formulaire est dans
  // le bandeau flottant (décision 2026-11-21-bandeau-messages).
  useFocusEffect(
    useCallback(() => {
      if (hasUser) {
        void refetch();
      }
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
          <View style={styles.links}>
            {/* Une seule liste, sans titre de groupe (décision 2026-11-21-menu-profil-sans-groupes) :
                les liens dans l'ordre servi. */}
            {(menu.data ?? []).map((item) => {
              const href = menuHref(item);

              return href === null ? null : <ProfileMenuLink key={item.key} href={href} label={item.label} testID={`profile-link-${item.key}`} />;
            })}
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
