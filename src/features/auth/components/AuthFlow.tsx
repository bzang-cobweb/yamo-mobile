import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { ApiError } from '@/shared/api/errors';
import { showToast } from '@/shared/components/Toast';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { loginService } from '../services/LoginService';
import { registerService } from '../services/RegisterService';
import { sessionService } from '../services/SessionService';
import type { Challenge, LoginChannel, PasswordMode, Session, VerifyResult } from '../types';
import { deviceName } from '../utils/device-name';
import { errorMessage } from '../utils/error-message';
import {
  channelOf,
  clearLastSignIn,
  loginValuesFor,
  maskedFor,
  readLastPhoneCountry,
  readLastSignIn,
  saveLastSignIn,
  type LastSignIn,
} from '../utils/last-sign-in';
import { AuthCodeStep } from './AuthCodeStep';
import { RestoreAccountPrompt } from './RestoreAccountPrompt';
import { WelcomeBackStep } from './WelcomeBackStep';

/** Le début du parcours : « Bon retour » (un dernier moyen mémorisé) ou le formulaire `auth.login`. */
/** `channel` : le canal présélectionné ; `values` : ce qui avait été saisi, retrouvé en revenant du code. */
type StartStep = { kind: 'welcome' } | { kind: 'form'; channel?: LoginChannel; values?: FormValues };

type Step =
  | StartStep
  /** `fromMemory` : le code est parti vers l'identifiant mémorisé ; « Essayer autrement » peut alors viser l'autre. */
  | { kind: 'code'; challenge: Challenge; fromMemory: boolean; back: StartStep }
  | { kind: 'password'; challenge: string; mode: PasswordMode; reset: boolean; channel: LoginChannel }
  | { kind: 'register'; challenge: string; channel: LoginChannel }
  | { kind: 'restore'; challenge: string; deletionDate: string };

type Props = {
  /** Connecté : le panneau se ferme. */
  onDone: () => void;
};

/**
 * Se connecter ou s'inscrire (contrat 2026-11-28-connexion-panneau, décision 2026-11-28-app-connexion-panneau) :
 * identifiant → code → mot de passe → (inscription). Au départ, « Bon retour » si l'appareil se souvient du dernier
 * moyen, sinon le formulaire `auth.login` (l'indicatif mémorisé par défaut). Le code part toujours ; c'est après lui que
 * le serveur dit la suite : le mot de passe du compte (« Mot de passe oublié ? » en choisit un nouveau), un mot de passe
 * à créer (compte sans mot de passe, ou pas de compte), puis l'inscription. Un compte en attente de suppression propose
 * d'abord d'être récupéré. Connecté : le dernier moyen est mémorisé, la session ouverte.
 */
export function AuthFlow({ onDone }: Props) {
  const { signIn, t } = useAuth();
  // `undefined` : la mémoire de l'appareil n'est pas encore lue.
  const [memory, setMemory] = useState<LastSignIn | null | undefined>(undefined);
  const [step, setStep] = useState<Step | null>(null);
  // L'indicatif du dernier numéro mémorisé : celui du formulaire, sinon celui servi (le pays courant).
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([readLastSignIn(), readLastPhoneCountry()]).then(([read, country]) => {
      if (active) {
        setMemory(read);
        setPhoneCountry(country ?? read?.phone_country ?? null);
        setStep(read === null ? { kind: 'form' } : { kind: 'welcome' });
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (step === null || memory === undefined) {
    return <ActivityIndicator style={styles.loading} accessibilityLabel={t('form.loading')} testID="auth-loading" />;
  }

  /** Un code envoyé : l'étape du code, qui revient à `back`. */
  async function login(values: FormValues, fromMemory: boolean, back: StartStep) {
    const challenge = await loginService.login(values);
    setStep({ kind: 'code', challenge, fromMemory, back });
  }

  /**
   * Le défi n'est plus valable (expiré, déjà servi, trop d'essais : erreur sur `code`, décision
   * 2026-11-28-connexion-panneau) : le message dans le bandeau, puis le début du parcours. Sinon l'erreur repart
   * vers le formulaire (erreurs de ses champs).
   */
  async function guard(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      if (error instanceof ApiError && error.errors.code !== undefined) {
        showToast(error.errors.code[0] ?? error.message, 'danger');
        setStep(memory === null ? { kind: 'form' } : { kind: 'welcome' });

        return;
      }
      throw error;
    }
  }

  async function finish(session: Session, channel: LoginChannel) {
    await saveLastSignIn(session.user, channel);
    await signIn(session);
    onDone();
  }

  if (step.kind === 'welcome' && memory !== null) {
    return (
      <WelcomeBackStep
        memory={memory}
        onContinue={async () => {
          const values = loginValuesFor(memory, memory.channel);
          if (values !== null) {
            await login(values, true, { kind: 'welcome' });
          }
        }}
        onNotYou={() => {
          void clearLastSignIn();
          setMemory(null);
          setStep({ kind: 'form' });
        }}
      />
    );
  }

  if (step.kind === 'welcome' || step.kind === 'form') {
    const channel = step.kind === 'form' ? step.channel : undefined;
    // L'indicatif du dernier numéro mémorisé, le canal présélectionné (« Essayer autrement »), ce qui avait été saisi.
    const defaults: FormValues = {
      ...(phoneCountry ? { phone_country: phoneCountry } : {}),
      ...(channel ? { channel } : {}),
      ...(step.kind === 'form' ? step.values : {}),
    };

    return <FormLoader key={`login-${channel ?? ''}`} name="auth.login" defaults={defaults} onSubmit={(values) => login(values, false, { kind: 'form', channel, values })} />;
  }

  if (step.kind === 'code') {
    const { challenge, fromMemory, back } = step;
    const other: LoginChannel = channelOf(challenge.channel) === 'email' ? 'phone' : 'email';
    // L'autre identifiant n'est connu que si le code est parti vers celui de la mémoire : même compte.
    const known = fromMemory && memory !== null ? loginValuesFor(memory, other) : null;

    return (
      <AuthCodeStep
        challenge={challenge}
        otherWay={{ channel: other, masked: known !== null && memory ? maskedFor(memory, other) : null }}
        onBack={() => setStep(back)}
        onOtherWay={async (channel) => {
          if (known === null) {
            // Inconnu : le formulaire, ce canal choisi.
            setStep({ kind: 'form', channel });

            return;
          }
          try {
            const next = await loginService.login(known);
            showToast(t('auth.codeSentTo', { destination: next.destination }));
            setStep({ kind: 'code', challenge: next, fromMemory: true, back });
          } catch (error) {
            showToast(errorMessage(error, t), 'danger');
          }
        }}
        onVerified={async (result: VerifyResult) => {
          const used = channelOf(challenge.channel);
          if (result.kind === 'password') {
            setStep({ kind: 'password', challenge: result.challenge, mode: result.mode, reset: false, channel: used });
          } else if (result.kind === 'restore') {
            setStep({ kind: 'restore', challenge: result.challenge, deletionDate: result.deletionDate });
          } else if (result.kind === 'session') {
            await finish(result.session, used);
          } else if (result.kind === 'pending') {
            setStep({ ...step, challenge: result.challenge });
          }
        }}
      />
    );
  }

  if (step.kind === 'password') {
    const { challenge, mode, reset, channel } = step;
    // Un compte avec mot de passe le donne ; sinon (ou « Mot de passe oublié ? ») il en choisit un, confirmé.
    const form = mode === 'sign-in' && !reset ? 'auth.session.password' : 'auth.session.new-password';

    return (
      <View style={styles.step}>
        <FormLoader
          key={form}
          name={form}
          onSubmit={(values) =>
            guard(async () => {
              const result = await sessionService.open(challenge, values, reset, deviceName());
              if (result.kind === 'session') {
                await finish(result.session, channel);
              } else {
                setStep({ kind: 'register', challenge: result.challenge, channel });
              }
            })
          }
        />
        {form === 'auth.session.password' && (
          <Pressable accessibilityRole="button" style={styles.link} testID="auth-forgot-password" onPress={() => setStep({ ...step, reset: true })}>
            <ThemedText type="linkPrimary">{t('auth.forgotPassword')}</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  if (step.kind === 'register') {
    const { challenge, channel } = step;

    return (
      <FormLoader
        name="auth.register"
        params={{ channel }}
        // L'indicatif mémorisé pour l'autre contact, comme à la connexion.
        defaults={phoneCountry ? { phone_country: phoneCountry } : undefined}
        onSubmit={(values) => guard(async () => finish(await registerService.register(challenge, values, deviceName()), channel))}
      />
    );
  }

  return <RestoreAccountPrompt challenge={step.challenge} deletionDate={step.deletionDate} onCancel={onDone} />;
}

const styles = StyleSheet.create({
  loading: { paddingVertical: Spacing.four },
  step: { gap: Spacing.three },
  link: { alignSelf: 'center', padding: Spacing.two },
});
