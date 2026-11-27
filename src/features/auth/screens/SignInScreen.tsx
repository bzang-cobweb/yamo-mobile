import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LocaleSwitcher } from '@/features/welcome/components/LocaleSwitcher';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { GuestScreen } from '../components/GuestScreen';
import { RestoreAccountPrompt } from '../components/RestoreAccountPrompt';
import { useAuth } from '../hooks/useAuth';
import { loginService } from '../services/LoginService';

/**
 * Connexion en deux étapes : e-mail ou téléphone et mot de passe (formulaire
 * `auth.login`), puis le code reçu (formulaire `auth.code`). L'app n'entre qu'une
 * fois le code validé. Un compte en attente de suppression propose d'abord d'être
 * récupéré. Liens vers le mot de passe oublié et la création de compte ; au retour
 * d'un mot de passe changé, une confirmation. L'en-tête ramène à l'accueil. Dans un onglet d'un visiteur (`embedded`,
 * décision 2026-11-27-visiteur-onglets) : sans en-tête, la langue en dessous.
 */
export function SignInScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { signIn, t } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const [restore, setRestore] = useState<{ challenge: string; deletionDate: string } | null>(null);

  if (restore !== null) {
    return (
      <GuestScreen title={embedded ? undefined : t('auth.signIn')} embedded={embedded}>
        <RestoreAccountPrompt
          challenge={restore.challenge}
          deletionDate={restore.deletionDate}
          onCancel={() => (embedded ? setRestore(null) : router.replace('/'))}
        />
      </GuestScreen>
    );
  }

  return (
    <GuestScreen title={embedded ? undefined : t('auth.signIn')} embedded={embedded}>
      {/* Dans un onglet, le titre de la page au-dessus du formulaire. */}
      {embedded && (
        <ThemedText type="subtitle" accessibilityRole="header" testID="sign-in-title">
          {t('auth.signIn')}
        </ThemedText>
      )}
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
          } else if (result.kind === 'restore') {
            setRestore({ challenge: result.challenge, deletionDate: result.deletionDate });
          }
        }}
      />
      <View style={styles.links}>
        <Pressable accessibilityRole="link" testID="sign-in-forgot" onPress={() => router.push('/forgot-password')}>
          <ThemedText type="linkPrimary">{t('auth.forgotPassword')}</ThemedText>
        </Pressable>
        {/* Depuis un onglet, l'inscription s'ouvre par-dessus : le retour y ramène. */}
        <Pressable accessibilityRole="link" testID="sign-in-register" onPress={() => (embedded ? router.push('/sign-up') : router.replace('/sign-up'))}>
          <ThemedText type="linkPrimary">{t('auth.createAccount')}</ThemedText>
        </Pressable>
      </View>
      {/* La langue, pour un visiteur, comme en bas de son ancien accueil (décision 2026-11-19-titre-tirets-avis). */}
      {embedded && (
        <View style={styles.language}>
          <LocaleSwitcher />
        </View>
      )}
    </GuestScreen>
  );
}

const styles = StyleSheet.create({
  links: { gap: Spacing.two },
  language: { alignItems: 'center', marginTop: Spacing.three },
});
