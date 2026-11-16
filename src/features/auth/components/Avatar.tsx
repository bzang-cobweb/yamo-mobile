import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';

import type { User } from '../types';

type Props = {
  user: Pick<User, 'initials' | 'avatar_url'>;
  /** Diamètre, en points. */
  size?: number;
};

/** Photo de profil ronde ; sans photo, les initiales calculées par l'API. */
export function Avatar({ user, size = 72 }: Props) {
  const { t } = useI18n();
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (user.avatar_url) {
    return (
      <Image
        testID="avatar-image"
        accessibilityLabel={t('avatar.label')}
        source={{ uri: user.avatar_url }}
        style={shape}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View
      testID="avatar-initials"
      accessibilityLabel={t('avatar.label')}
      style={[styles.initials, shape, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>{user.initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: { alignItems: 'center', justifyContent: 'center' },
});
