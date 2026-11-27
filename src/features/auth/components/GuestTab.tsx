import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SubmitButton } from '@/features/form/components/DynamicForm';
import { LocaleSwitcher } from '@/features/welcome/components/LocaleSwitcher';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

type Props = {
  /** Le titre de l'onglet (« Profil », « Notifications »). */
  title: string;
  /** Pourquoi se connecter, pour cet onglet. */
  message: string;
  testID: string;
};

/**
 * Un onglet réservé aux membres, vu par un visiteur (décision 2026-11-27-onglets-visiteur-invitation) : le titre de
 * l'onglet, un message d'invitation, un bouton « Se connecter ou s'inscrire » qui ouvre la connexion (l'inscription
 * suit d'elle-même pour un identifiant inconnu) ; la langue en dessous.
 */
export function GuestTab({ title, message, testID }: Props) {
  const { t } = useAuth();

  return (
    <ThemedView style={styles.container} testID={testID}>
      <View style={styles.content}>
        <ThemedText type="subtitle" accessibilityRole="header" testID={`${testID}-title`}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" testID={`${testID}-message`}>
          {message}
        </ThemedText>
        <SubmitButton
          label={t('auth.signInOrUp')}
          busy={false}
          submitting={false}
          destructive={false}
          testID={`${testID}-sign-in`}
          onPress={() => router.push('/sign-in')}
        />
        <View style={styles.language}>
          <LocaleSwitcher />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  language: { alignItems: 'center', marginTop: Spacing.three },
});
