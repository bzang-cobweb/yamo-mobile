import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, type AlertButton } from 'react-native';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { ApiError, NetworkError } from '@/shared/api/errors';
import { ThemedText } from '@/shared/theme/components/themed-text';

import { useAuth } from '../hooks/useAuth';
import { profileService, type ProfileService } from '../services/ProfileService';
import type { AvatarFile, User } from '../types';
import { pickAvatar } from '../utils/pick-avatar';
import { Avatar } from './Avatar';

type Props = {
  /** Injectables pour les tests. */
  service?: Pick<ProfileService, 'uploadAvatar' | 'removeAvatar'>;
  pick?: () => Promise<AvatarFile | null>;
};

const SIZE = 96;

/**
 * Photo de profil modifiable : la toucher propose de choisir une photo dans la
 * galerie ou de la retirer. L'utilisateur affiché partout est mis à jour.
 */
export function AvatarPicker({ service = profileService, pick = pickAvatar }: Props) {
  const { user, setUser, t } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function run(action: () => Promise<User>) {
    setBusy(true);
    setError(null);

    try {
      setUser(await action());
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.errors.avatar?.[0] ?? caught.message);
      } else if (caught instanceof NetworkError) {
        setError(t('offline.message'));
      } else {
        setError(t('error.unknown'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function choose() {
    const file = await pick();

    if (file) {
      await run(() => service.uploadAvatar(file));
    }
  }

  function openMenu() {
    const buttons: AlertButton[] = [
      { text: t('avatar.choose'), onPress: choose },
      ...(user?.avatar_url
        ? [{ text: t('avatar.remove'), style: 'destructive' as const, onPress: () => run(() => service.removeAvatar()) }]
        : []),
      { text: t('avatar.cancel'), style: 'cancel' },
    ];

    Alert.alert(t('avatar.label'), undefined, buttons);
  }

  return (
    <View style={styles.container}>
      <Pressable
        testID="avatar-picker"
        accessibilityRole="button"
        accessibilityLabel={t('avatar.change')}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={openMenu}>
        <Avatar user={user} size={SIZE} />
        {busy && (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </Pressable>
      <ThemedText type="small" themeColor="textSecondary">
        {busy ? t('avatar.uploading') : t('avatar.change')}
      </ThemedText>
      {error && (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert" testID="avatar-error">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  overlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: ERROR_COLOR, textAlign: 'center' },
});
