import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';
import { accountRestoreService } from '../services/AccountRestoreService';
import { deviceName } from '../utils/device-name';

const PRIMARY = '#208AEF';

type Props = {
  challenge: string;
  /** Date de la purge définitive, `AAAA-MM-JJ`. */
  deletionDate: string;
  /** « Annuler » : le compte reste en attente de suppression. */
  onCancel: () => void;
};

/**
 * Connexion à un compte en attente de suppression : la date de la purge, puis
 * « Récupérer mon compte » (restauré et connecté) ou « Annuler ».
 */
export function RestoreAccountPrompt({ challenge, deletionDate, onCancel }: Props) {
  const { signIn, t, locale } = useAuth();
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const date = new Date(`${deletionDate}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  async function restore() {
    setRestoring(true);
    setError(null);

    try {
      const session = await accountRestoreService.restore(challenge, deviceName());
      Alert.alert(t('auth.accountRestored'));
      await signIn(session);
    } catch (caught) {
      setError(caught instanceof ApiError ? (Object.values(caught.errors)[0]?.[0] ?? caught.message) : t('error.unknown'));
      setRestoring(false);
    }
  }

  return (
    <View style={styles.container} testID="restore-account">
      <ThemedText type="subtitle" accessibilityRole="header">
        {t('auth.restoreTitle')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" testID="restore-account-message">
        {t('auth.restoreMessage', { date })}
      </ThemedText>
      {error && (
        <ThemedText type="small" accessibilityRole="alert" testID="restore-account-error">
          {error}
        </ThemedText>
      )}
      <Pressable
        testID="restore-account-confirm"
        accessibilityRole="button"
        disabled={restoring}
        onPress={restore}
        style={({ pressed }) => [styles.button, styles.primary, (pressed || restoring) && styles.pressed]}>
        {restoring && <ActivityIndicator color="#fff" />}
        <ThemedText style={styles.primaryText}>{t('auth.restoreConfirm')}</ThemedText>
      </Pressable>
      <Pressable testID="restore-account-cancel" accessibilityRole="button" disabled={restoring} onPress={onCancel} style={styles.cancel}>
        <ThemedText type="linkPrimary">{t('auth.restoreCancel')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  button: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, borderRadius: 8, paddingVertical: Spacing.three },
  primary: { backgroundColor: PRIMARY },
  primaryText: { color: '#fff' },
  pressed: { opacity: 0.8 },
  cancel: { alignSelf: 'center', padding: Spacing.two },
});
