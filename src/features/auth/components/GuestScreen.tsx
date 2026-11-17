import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/shared/components/BackHeader';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

type Props = PropsWithChildren<{
  /** Titre de l'en-tête fixe (flèche de retour, titre centré) ; sans titre, aucun en-tête. */
  title?: string;
}>;

/** Mise en page des écrans d'invité (connexion, inscription, mot de passe oublié). */
export function GuestScreen({ title, children }: Props) {
  const content = (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {title === undefined ? (
          content
        ) : (
          <BackStackProvider>
            <BackHeader title={title} />
            {content}
          </BackStackProvider>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
