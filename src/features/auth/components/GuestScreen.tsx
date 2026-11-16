import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/shared/components/BackHeader';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

type Props = PropsWithChildren<{
  /** En-tête de retour fixé en haut (« ← Se connecter ») ; aucun pour la connexion. */
  back?: { label: string; onPress?: () => void };
}>;

/** Mise en page des écrans d'invité (connexion, inscription, mot de passe oublié). */
export function GuestScreen({ back, children }: Props) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {back && <BackHeader label={back.label} onPress={back.onPress} />}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
