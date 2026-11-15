import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

/** Lien de l'accueil vers l'écran Profil. */
export function ProfileLink() {
  const { t } = useAuth();

  return (
    <Link href="/profile" testID="profile-link" style={styles.link}>
      <ThemedText type="linkPrimary">{t('home.profile')}</ThemedText>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: { padding: Spacing.two },
});
