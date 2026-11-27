import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApplication } from '@/features/welcome/hooks/useApplication';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { AvatarPicker } from '../components/AvatarPicker';
import { ProfileMenuLinks } from '../components/ProfileMenuLinks';
import { SignOutButton } from '../components/SignOutButton';
import { useAuth } from '../hooks/useAuth';
import { useProfileMenu } from '../hooks/useProfileMenu';

/**
 * Profil (onglet), sans titre : photo modifiable, nom complet, e-mail et
 * téléphone (format international) selon les canaux de l'application, menu de
 * ses formulaires et sous-menus, déconnexion. Le menu (liens, ordre, icônes,
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
                {/* Masqué (décision 2026-11-27-email-telephone-masques). */}
                {user.email_masked ?? user.email}
              </ThemedText>
            )}
            {channels.phone && user.phone && (
              <ThemedText themeColor="textSecondary" testID="profile-phone">
                {user.phone_masked ?? user.phone_international ?? user.phone}
              </ThemedText>
            )}
          </View>
          {/* Une seule liste, sans titre de groupe (décision 2026-11-21-menu-profil-sans-groupes) : les liens dans
              l'ordre servi. « Supprimer mon compte » est dans « Confidentialité » (décision
              2026-11-27-confidentialite). */}
          <ProfileMenuLinks items={menu.data ?? []} />
          <SignOutButton />
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
});
