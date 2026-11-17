import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import type { ProfileNotice } from './ProfileFormScreen';

/**
 * Profil (onglet), sans titre : photo modifiable, nom complet, e-mail et
 * téléphone (format international) selon les canaux de l'application, liens vers ses formulaires (dont ajouter ou
 * changer l'e-mail et le numéro), déconnexion, suppression du compte. Un formulaire enregistré revient
 * ici avec `notice`, qui affiche une confirmation.
 */
export function ProfileScreen() {
  const { user, t } = useAuth();
  // Canaux de compte de l'application ; tant qu'ils ne sont pas connus, les deux.
  const channels = useApplication().data?.channels ?? { email: true, phone: true };
  const { notice } = useLocalSearchParams<{ notice?: ProfileNotice }>();
  const notices = {
    saved: t('profile.saved'),
    password: t('profile.passwordSaved'),
    email: t('profile.emailSaved'),
    phone: t('profile.phoneSaved'),
  } as const;
  const message = notice && notice in notices ? notices[notice] : null;

  // En quittant le profil (vers un formulaire, un autre onglet), la confirmation s'efface.
  useFocusEffect(useCallback(() => () => router.setParams({ notice: undefined }), []));

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
            <ProfileMenuLink href="/profile/personal" label={t('profile.personalInfo')} testID="profile-link-personal" />
            {channels.email && (
              <ProfileMenuLink
                href="/profile/email"
                label={user.email ? t('profile.changeEmail') : t('profile.addEmail')}
                testID="profile-link-email"
              />
            )}
            {channels.phone && (
              <ProfileMenuLink
                href="/profile/phone"
                label={user.phone ? t('profile.changePhone') : t('profile.addPhone')}
                testID="profile-link-phone"
              />
            )}
            <ProfileMenuLink href="/profile/password" label={t('profile.password')} testID="profile-link-password" />
            <ProfileMenuLink href="/profile/preferences" label={t('profile.preferences')} testID="profile-link-preferences" />
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
