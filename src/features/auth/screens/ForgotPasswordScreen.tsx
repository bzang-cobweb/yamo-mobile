import { router } from 'expo-router';
import { useState } from 'react';

import { FormLoader } from '@/features/form/components/FormLoader';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { GuestScreen } from '../components/GuestScreen';
import { useAuth } from '../hooks/useAuth';
import { passwordResetService } from '../services/PasswordResetService';

/**
 * Mot de passe oublié : e-mail ou téléphone (formulaire `auth.password.forgot`), code
 * reçu, puis nouveau mot de passe et confirmation (formulaire `auth.password.reset`).
 * À la fin, retour à la connexion avec une confirmation.
 */
export function ForgotPasswordScreen() {
  const { t } = useAuth();
  const [challenge, setChallenge] = useState<string | null>(null);

  return (
    <GuestScreen title={t('auth.forgotPasswordTitle')}>
      {challenge === null ? (
        <ChallengeFlow
          hideFormTitle
          form="auth.password.forgot"
          start={(values) => passwordResetService.forgot(values)}
          onVerified={async (result) => {
            if (result.kind === 'password') {
              setChallenge(result.challenge);
            }
          }}
        />
      ) : (
        <FormLoader
          name="auth.password.reset"
          onSubmit={async (values) => {
            await passwordResetService.reset(challenge, values);
            router.dismissTo({ pathname: '/sign-in', params: { notice: 'passwordReset' } });
          }}
        />
      )}
    </GuestScreen>
  );
}
