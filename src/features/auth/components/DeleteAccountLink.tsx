import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

/** Bas du profil, sous la déconnexion : ouvre le formulaire de suppression du compte. */
export function DeleteAccountLink() {
  const { t } = useAuth();

  return (
    <Pressable
      testID="profile-delete-account"
      accessibilityRole="link"
      onPress={() => router.push('/profile/delete-account')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="small" style={styles.text}>
        {t('profile.deleteAccount')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: Spacing.two, alignSelf: 'center' },
  text: { color: ERROR_COLOR },
  pressed: { opacity: 0.6 },
});
