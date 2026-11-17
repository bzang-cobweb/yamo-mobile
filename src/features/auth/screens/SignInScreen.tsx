import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { GuestScreen } from '../components/GuestScreen';
import { useAuth } from '../hooks/useAuth';
import { loginService } from '../services/LoginService';

/**
 * Connexion en deux étapes : e-mail ou téléphone et mot de passe (formulaire
 * `auth.login`), puis le code reçu (formulaire `auth.code`). L'app n'entre qu'une
 * fois le code validé. Liens vers le mot de passe oublié et la création de compte ;
 * au retour d'un mot de passe changé, une confirmation. L'en-tête ramène à l'accueil.
 */
export function SignInScreen() {
  const { signIn, t } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();

  return (
    <GuestScreen title={t('auth.signIn')}>
      {notice === 'passwordReset' && (
        <ThemedText themeColor="textSecondary" accessibilityRole="alert" testID="sign-in-notice">
          {t('auth.passwordReset')}
        </ThemedText>
      )}
      <ChallengeFlow
        hideFormTitle
        form="auth.login"
        start={(values) => loginService.login(values)}
        onVerified={async (result) => {
          if (result.kind === 'session') {
            await signIn(result.session);
          }
        }}
      />
      <View style={styles.links}>
        <Pressable accessibilityRole="link" testID="sign-in-forgot" onPress={() => router.push('/forgot-password')}>
          <ThemedText type="linkPrimary">{t('auth.forgotPassword')}</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="link" testID="sign-in-register" onPress={() => router.replace('/sign-up')}>
          <ThemedText type="linkPrimary">{t('auth.createAccount')}</ThemedText>
        </Pressable>
      </View>
    </GuestScreen>
  );
}

const styles = StyleSheet.create({
  links: { gap: Spacing.two },
});
