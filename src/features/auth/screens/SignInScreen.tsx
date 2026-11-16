import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormLoader } from '@/features/form/components/FormLoader';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

/**
 * Connexion : titre, sous-titre et champs sont ceux du formulaire `auth.login`
 * envoyé par l'API (traduits) ; le nom de l'appareil est ajouté par `LoginService`.
 */
export function SignInScreen() {
  const { signIn } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
          <FormLoader name="auth.login" onSubmit={signIn} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  form: { width: '100%', maxWidth: MaxContentWidth / 2, gap: Spacing.three },
});
