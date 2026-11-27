import { router } from 'expo-router';
import { useState } from 'react';

import type { FormValues } from '@/features/form/types';
import { useBackStep } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { GuestScreen } from '../components/GuestScreen';
import { RestoreAccountPrompt } from '../components/RestoreAccountPrompt';
import { useAuth } from '../hooks/useAuth';
import { loginService } from '../services/LoginService';
import { registerService } from '../services/RegisterService';
import type { VerifyResult } from '../types';

/**
 * Se connecter ou s'inscrire, sans mot de passe (décision 2026-11-27-connexion-sans-mot-de-passe) : l'e-mail ou le
 * téléphone (formulaire `auth.login`), puis le code reçu (`auth.code`). Pour un identifiant inconnu, l'inscription
 * (`auth.register` : pseudonyme, prénom, nom, date de naissance) part avec cet identifiant, puis le code. L'app n'entre
 * qu'une fois le code validé. Un compte en attente de suppression propose d'abord d'être récupéré.
 */
export function SignInScreen() {
  const { t } = useAuth();
  const [register, setRegister] = useState<Record<string, string> | null>(null);

  return (
    <GuestScreen title={register === null ? t('auth.signIn') : t('auth.createAccount')}>
      <SignInFlow register={register} onRegister={setRegister} />
    </GuestScreen>
  );
}

type FlowProps = {
  /** L'identifiant d'un compte à créer, ou `null` : la connexion. */
  register: Record<string, string> | null;
  onRegister: (values: Record<string, string> | null) => void;
};

function SignInFlow({ register, onRegister }: FlowProps) {
  const { signIn, t } = useAuth();
  const [restore, setRestore] = useState<{ challenge: string; deletionDate: string } | null>(null);
  // Depuis l'inscription, la flèche de l'en-tête revient à la connexion.
  useBackStep(register !== null, () => onRegister(null));

  async function onVerified(result: Exclude<VerifyResult, { kind: 'pending' }>) {
    if (result.kind === 'session') {
      await signIn(result.session);
    } else if (result.kind === 'restore') {
      setRestore({ challenge: result.challenge, deletionDate: result.deletionDate });
    }
  }

  if (restore !== null) {
    return <RestoreAccountPrompt challenge={restore.challenge} deletionDate={restore.deletionDate} onCancel={() => router.replace('/')} />;
  }

  if (register !== null) {
    return (
      <>
        <ThemedText themeColor="textSecondary" testID="sign-up-intro">
          {t('auth.registerIntro')}
        </ThemedText>
        <ChallengeFlow
          key="register"
          hideFormTitle
          form="auth.register"
          start={(values: FormValues) => registerService.register({ ...values, ...register })}
          onVerified={onVerified}
        />
      </>
    );
  }

  return (
    <ChallengeFlow
      key="login"
      hideFormTitle
      form="auth.login"
      start={async (values) => {
        const response = await loginService.login(values);

        if ('next' in response) {
          onRegister(response.values);

          return null;
        }

        return response;
      }}
      onVerified={onVerified}
    />
  );
}
