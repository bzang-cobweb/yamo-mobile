import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormLoader } from '@/features/form/components/FormLoader';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { verificationService } from '../services/VerificationService';
import type { Challenge, LoginChannel, VerifyResult } from '../types';
import { deviceName } from '../utils/device-name';
import { resendCode } from '../utils/resend-code';

/** « Essayer autrement » : l'autre canal, et son identifiant masqué s'il est connu. */
export type OtherWay = { channel: LoginChannel; masked: string | null };

type Props = {
  challenge: Challenge;
  /** L'autre canal que celui du code envoyé. */
  otherWay: OtherWay;
  /** Le code validé : l'étape suivante (mot de passe, récupération du compte…). */
  onVerified: (result: VerifyResult) => Promise<void>;
  /** Recevoir un code par l'autre canal. */
  onOtherWay: (channel: LoginChannel) => Promise<void>;
  /** Revenir à l'étape précédente (« Bon retour » ou le formulaire). */
  onBack: () => void;
};

/**
 * L'étape du code (décision 2026-11-28-app-connexion-panneau) : « Nous avons envoyé un code à <masqué> », le formulaire
 * `auth.code` envoyé dès le sixième chiffre, « Vous ne l'avez pas reçu ? Envoyer un nouveau code », « Essayer
 * autrement » (un panneau à la hauteur de son contenu : un code par SMS ou par e-mail), le retour.
 */
export function AuthCodeStep({ challenge, otherWay, onVerified, onOtherWay, onBack }: Props) {
  const { t } = useAuth();
  const [choosing, setChoosing] = useState(false);

  return (
    <View style={styles.step} testID="auth-code">
      <ThemedText themeColor="textSecondary" testID="auth-code-sent">
        {t('auth.codeSentTo', { destination: challenge.destination })}
      </ThemedText>
      <FormLoader
        // Un nouveau défi (autre canal) repart d'un champ vide.
        key={`${challenge.challenge}-${challenge.channel}`}
        name="auth.code"
        onSubmit={async (values) => onVerified(await verificationService.verify(challenge, String(values.code ?? ''), deviceName()))}
      />
      <View style={styles.line}>
        <ThemedText themeColor="textSecondary">{t('auth.didntGetIt')}</ThemedText>
        <Pressable accessibilityRole="button" testID="auth-code-resend" onPress={() => void resendCode(challenge, t)}>
          <ThemedText type="linkPrimary">{t('auth.sendNewCode')}</ThemedText>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" testID="auth-code-other-way" onPress={() => setChoosing(true)}>
        <ThemedText type="linkPrimary">{t('auth.tryAnotherWay')}</ThemedText>
      </Pressable>
      <Pressable accessibilityRole="button" testID="auth-code-back" onPress={onBack}>
        <ThemedText type="linkPrimary">← {t('auth.previousStep')}</ThemedText>
      </Pressable>

      <BottomSheet visible={choosing} title={t('auth.tryAnotherWay')} fitContent onClose={() => setChoosing(false)} testID="auth-other-way">
        <View style={styles.choices}>
          <Pressable
            accessibilityRole="button"
            testID={`auth-other-way-${otherWay.channel}`}
            onPress={() => {
              setChoosing(false);
              void onOtherWay(otherWay.channel);
            }}>
            <ThemedText type="smallBold">{t(otherWay.channel === 'phone' ? 'auth.codeBySms' : 'auth.codeByEmail')}</ThemedText>
            {otherWay.masked !== null && (
              <ThemedText type="small" themeColor="textSecondary" testID="auth-other-way-masked">
                {otherWay.masked}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  choices: { padding: Spacing.four, gap: Spacing.three },
});
