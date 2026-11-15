import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { user, signOut, t } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">{t('home.greeting', { name: user.name })}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {t('home.signedInAs', { fullName: `${user.first_name} ${user.last_name}`.trim() })}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{t('home.email', { email: user.email })}</ThemedText>

        <Pressable
          testID="sign-out"
          accessibilityRole="button"
          disabled={signingOut}
          onPress={() => {
            setSigningOut(true);
            signOut();
          }}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <ThemedText type="linkPrimary">{t('home.signOut')}</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  button: { marginTop: Spacing.four, padding: Spacing.two },
  buttonPressed: { opacity: 0.6 },
});
