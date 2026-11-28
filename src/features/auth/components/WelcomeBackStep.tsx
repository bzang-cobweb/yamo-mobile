import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SubmitButton } from '@/features/form/components/DynamicForm';
import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../utils/error-message';
import { maskedFor, type LastSignIn } from '../utils/last-sign-in';

type Props = {
  memory: LastSignIn;
  /** « Se connecter » : demande un code pour l'identifiant mémorisé. */
  onContinue: () => Promise<void>;
  /** « Ce n'est pas vous ? » : oublier le dernier moyen, montrer le formulaire. */
  onNotYou: () => void;
};

/**
 * « Bon retour, Prénom Nom » (décision 2026-11-28-app-connexion-panneau) : l'identifiant masqué du dernier canal, la
 * note qui dit par où part le code, « Se connecter », et « Ce n'est pas vous ? ».
 */
export function WelcomeBackStep({ memory, onContinue, onNotYou }: Props) {
  const { t } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `${memory.first_name} ${memory.last_name}`.trim();

  async function send() {
    if (sending) {
      return;
    }
    setSending(true);
    setError(null);

    try {
      await onContinue();
    } catch (caught) {
      setError(errorMessage(caught, t));
      setSending(false);
    }
  }

  return (
    <View style={styles.step} testID="auth-welcome">
      <View style={styles.header}>
        <ThemedText type="subtitle" accessibilityRole="header" testID="auth-welcome-title">
          {t('auth.welcomeBack', { name })}
        </ThemedText>
        <ThemedText themeColor="textSecondary" testID="auth-welcome-identifier">
          {maskedFor(memory, memory.channel) ?? ''}
        </ThemedText>
      </View>
      <ThemedText testID="auth-welcome-note">{t(memory.channel === 'phone' ? 'auth.welcomeNote.sms' : 'auth.welcomeNote.email')}</ThemedText>
      {error && (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert" testID="auth-welcome-error">
          {error}
        </ThemedText>
      )}
      <SubmitButton label={t('auth.signIn')} busy={sending} submitting={sending} destructive={false} onPress={() => void send()} testID="auth-welcome-sign-in" />
      <Pressable accessibilityRole="button" disabled={sending} style={styles.link} testID="auth-not-you" onPress={onNotYou}>
        <ThemedText type="linkPrimary">{t('auth.notYou')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  header: { gap: Spacing.one },
  error: { color: ERROR_COLOR },
  link: { alignSelf: 'center', padding: Spacing.two },
});
