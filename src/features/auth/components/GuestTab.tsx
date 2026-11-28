import { StyleSheet, View } from 'react-native';

import { SubmitButton } from '@/features/form/components/DynamicForm';
import { LocaleSwitcher } from '@/features/welcome/components/LocaleSwitcher';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { openAuthSheet } from './AuthSheet';

type Props = {
  /** Le titre de l'onglet (« Profil », « Notifications »). */
  title: string;
  /** Le sous-titre, sous le titre (`auth.guest.profileSubtitle`…). */
  subtitle: string;
  /** Pourquoi se connecter, pour cet onglet. */
  message: string;
  testID: string;
};

/**
 * Un onglet réservé aux membres, vu par un visiteur, le même pour Profil et Notifications (décisions
 * 2026-11-27-onglets-visiteur-invitation et 2026-11-28-app-connexion-panneau) : le titre de l'onglet, un sous-titre, un
 * message d'invitation, un bouton « Se connecter ou s'inscrire » qui ouvre le panneau de connexion (l'inscription y
 * suit) ; la langue en dessous.
 */
export function GuestTab({ title, subtitle, message, testID }: Props) {
  const { t } = useAuth();

  return (
    <ThemedView style={styles.container} testID={testID}>
      <View style={styles.content}>
        <ThemedText type="subtitle" accessibilityRole="header" testID={`${testID}-title`}>
          {title}
        </ThemedText>
        <ThemedText type="smallBold" testID={`${testID}-subtitle`}>
          {subtitle}
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
          onPress={openAuthSheet}
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
