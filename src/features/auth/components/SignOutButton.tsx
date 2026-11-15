import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

/** Déconnecte l'appareil : révoque son jeton et revient à l'écran de connexion. */
export function SignOutButton() {
  const { signOut, t } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Pressable
      testID="sign-out"
      accessibilityRole="button"
      disabled={signingOut}
      onPress={() => {
        setSigningOut(true);
        signOut();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="linkPrimary">{t('home.signOut')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: Spacing.two },
  pressed: { opacity: 0.6 },
});
