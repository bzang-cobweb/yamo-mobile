import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { ApiError } from '@/shared/api/errors';
import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { verificationService } from '../services/VerificationService';
import type { Challenge, VerifyResult } from '../types';
import { deviceName } from '../utils/device-name';

type Props = {
  /** Formulaire de la première étape (`auth.login`, `auth.register`, `auth.profile.email`…). */
  form: string;
  /** Envoie la première étape ; l'API répond par le code envoyé. */
  start: (values: FormValues) => Promise<Challenge>;
  /** Dernier code validé : session ouverte ou compte modifié. */
  onVerified: (result: Exclude<VerifyResult, { kind: 'pending' }>) => Promise<void>;
};

/**
 * Opération vérifiée par code : le formulaire de l'opération, puis le formulaire
 * `auth.code` pour chaque code envoyé (« Code envoyé à … », renvoi possible).
 * Rien n'est acquis avant que l'API ait validé le dernier code.
 */
export function ChallengeFlow({ form, start, onVerified }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  if (challenge === null) {
    return <FormLoader name={form} onSubmit={async (values) => setChallenge(await start(values))} />;
  }

  return (
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
        <Pressable accessibilityRole="button" testID="code-back" onPress={onBack}>
          <ThemedText type="linkPrimary">← {t('profile.back')}</ThemedText>
        </Pressable>
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
});
