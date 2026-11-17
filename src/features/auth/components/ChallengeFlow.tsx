import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { ApiError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { useBackStep } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { verificationService } from '../services/VerificationService';
import type { Challenge, VerifyResult } from '../types';
import { deviceName } from '../utils/device-name';

type Props = {
  /** Formulaire de la première étape (`auth.login`, `auth.register`, un formulaire du profil…). */
  form: string;
  /**
   * Envoie la première étape ; l'API répond par le code envoyé. `null` : l'opération
   * est achevée sans code (formulaire du profil qui n'en demande pas).
   */
  start: (values: FormValues) => Promise<Challenge | null>;
  /** Dernier code validé : session ouverte ou compte modifié. */
  onVerified: (result: Exclude<VerifyResult, { kind: 'pending' }>) => Promise<void>;
  /** Le titre du premier formulaire est affiché par l'en-tête de l'écran. */
  hideFormTitle?: boolean;
};

/**
 * Opération vérifiée par code : le formulaire de l'opération, puis le formulaire
 * `auth.code` pour chaque code envoyé (« Code envoyé à … », renvoi possible).
 * Rien n'est acquis avant que l'API ait validé le dernier code.
 */
export function ChallengeFlow({ form, start, onVerified, hideFormTitle = false }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  return (
    <>
      {/* Le formulaire reste monté pendant l'étape de code : en y revenant, on retrouve
          son étape et ses valeurs. */}
      <View style={challenge === null ? undefined : styles.hidden}>
        <FormLoader name={form} hideTitle={hideFormTitle} onSubmit={async (values) => setChallenge(await start(values))} />
      </View>
      {challenge !== null && (
        <CodeStep
          // Un nouveau code (inscription : e-mail puis téléphone) repart d'un champ vide.
          key={`${challenge.challenge}-${challenge.channel}`}
          challenge={challenge}
          onBack={() => setChallenge(null)}
          onSubmit={async (values) => {
            const result = await verificationService.verify(challenge, String(values.code ?? ''), deviceName());

            if (result.kind === 'pending') {
              setChallenge(result.challenge);
            } else {
              await onVerified(result);
            }
          }}
        />
      )}
    </>
  );
}

type CodeStepProps = {
  challenge: Challenge;
  onBack: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
};

function CodeStep({ challenge, onBack, onSubmit }: CodeStepProps) {
  const { t } = useI18n();
  const [notice, setNotice] = useState<string | null>(null);
  // Avec un en-tête de retour, sa flèche revient au formulaire ; sinon, un lien dans l'étape.
  const hasBackHeader = useBackStep(true, onBack);

  async function resend() {
    try {
      await verificationService.resend(challenge);
      setNotice(t('auth.resent'));
    } catch (error) {
      // Trop tôt, défi expiré… : le message de l'API, sinon le message général.
      setNotice(error instanceof ApiError ? (Object.values(error.errors)[0]?.[0] ?? error.message) : t('error.unknown'));
    }
  }

  return (
    <View style={styles.step}>
      <ThemedText themeColor="textSecondary" testID="code-sent">
        {t('auth.codeSent', { destination: challenge.destination })}
      </ThemedText>
      <FormLoader name="auth.code" onSubmit={onSubmit} />
      <View style={styles.links}>
        <Pressable accessibilityRole="button" testID="code-resend" onPress={resend}>
          <ThemedText type="linkPrimary">{t('auth.resend')}</ThemedText>
        </Pressable>
        {!hasBackHeader && (
          <Pressable accessibilityRole="button" testID="code-back" onPress={onBack}>
            <ThemedText type="linkPrimary">← {t('auth.previousStep')}</ThemedText>
          </Pressable>
        )}
      </View>
      {notice && (
        <ThemedText type="small" themeColor="textSecondary" accessibilityRole="alert" testID="code-notice">
          {notice}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  links: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  hidden: { display: 'none' },
});
