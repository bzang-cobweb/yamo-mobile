import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { AvatarPicker } from '../components/AvatarPicker';
import { ProfileMenuLink } from '../components/ProfileMenuLink';
import { SignOutButton } from '../components/SignOutButton';
import { useAuth } from '../hooks/useAuth';
import type { ProfileNotice } from './ProfileFormScreen';

/**
 * Profil (onglet) : photo modifiable, prénom et nom, e-mail, liens vers les trois
 * formulaires, déconnexion. Un formulaire enregistré revient ici avec `notice`,
 * qui affiche une confirmation.
 */
export function ProfileScreen() {
  const { user, t } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: ProfileNotice }>();
  const message = notice === 'password' ? t('profile.passwordSaved') : notice === 'saved' ? t('profile.saved') : null;

  // En quittant le profil (vers un formulaire, un autre onglet), la confirmation s'efface.
  useFocusEffect(useCallback(() => () => router.setParams({ notice: undefined }), []));

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">{t('profile.title')}</ThemedText>
          <AvatarPicker />
          <View style={styles.identity}>
            <ThemedText type="smallBold" testID="profile-full-name">
              {user.full_name}
            </ThemedText>
            <ThemedText themeColor="textSecondary" testID="profile-email">
              {user.email}
            </ThemedText>
          </View>
          {message && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityRole="alert" testID="profile-notice">
              {message}
            </ThemedText>
          )}
          <View style={styles.links}>
            <ProfileMenuLink href="/profile/personal" label={t('profile.personalInfo')} testID="profile-link-personal" />
            <ProfileMenuLink href="/profile/password" label={t('profile.password')} testID="profile-link-password" />
            <ProfileMenuLink href="/profile/preferences" label={t('profile.preferences')} testID="profile-link-preferences" />
          </View>
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
  links: { gap: Spacing.two },
});
