import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { GuestScreen } from '../components/GuestScreen';
import { useAuth } from '../hooks/useAuth';
import { registerService } from '../services/RegisterService';

/**
 * Créer un compte en trois étapes (formulaire `auth.register` : qui, comment joindre,
 * mot de passe), puis un code par identifiant saisi. Le compte
 * n'existe qu'une fois tous les codes validés ; l'app est alors connectée.
 */
export function SignUpScreen() {
  const { signIn, t } = useAuth();

  return (
    <GuestScreen back={{ label: t('auth.signIn') }}>
      <ChallengeFlow
        form="auth.register"
        start={(values) => registerService.register(values)}
        onVerified={async (result) => {
          if (result.kind === 'session') {
            await signIn(result.session);
          }
        }}
      />
      <Pressable accessibilityRole="link" testID="sign-up-sign-in" onPress={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}>
        <ThemedText type="linkPrimary">{t('auth.haveAccount')}</ThemedText>
      </Pressable>
    </GuestScreen>
  );
}
