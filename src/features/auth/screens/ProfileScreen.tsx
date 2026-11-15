import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/ProfileService';

/**
 * Profil : changement de langue par le formulaire `auth.profile.locale` de
 * l'API. L'enregistrement met à jour le compte ; l'app bascule aussitôt dans la
 * nouvelle langue (formulaires de l'API compris).
 */
export function ProfileScreen() {
  const { setUser, t } = useAuth();
  const [saved, setSaved] = useState(false);

  async function save(values: FormValues) {
    setSaved(false);
    setUser(await profileService.update(values));
    setSaved(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <Pressable accessibilityRole="link" testID="profile-back" onPress={() => router.back()}>
            <ThemedText type="linkPrimary">← {t('profile.back')}</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">{t('profile.title')}</ThemedText>
          <FormLoader name="auth.profile.locale" onSubmit={save} />
          {saved && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityRole="alert" testID="profile-saved">
              {t('profile.saved')}
            </ThemedText>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, gap: Spacing.three },
});
