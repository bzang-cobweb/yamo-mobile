import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { GuestScreen } from '../components/GuestScreen';
import { useAuth } from '../hooks/useAuth';
import { loginService } from '../services/LoginService';

/**
 * Connexion en deux étapes : e-mail ou téléphone et mot de passe (formulaire
 * `auth.login`), puis le code reçu (formulaire `auth.code`). L'app n'entre qu'une
 * fois le code validé. Lien vers la création de compte.
 */
export function SignInScreen() {
  const { signIn, t } = useAuth();

  return (
    <GuestScreen>
      <ChallengeFlow
        form="auth.login"
        start={(values) => loginService.login(values)}
        onVerified={async (result) => {
          if (result.kind === 'session') {
            await signIn(result.session);
          }
        }}
      />
      <Pressable accessibilityRole="link" testID="sign-in-register" onPress={() => router.push('/sign-up')}>
        <ThemedText type="linkPrimary">{t('auth.createAccount')}</ThemedText>
      </Pressable>
    </GuestScreen>
  );
}
