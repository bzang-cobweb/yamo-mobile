import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, NetworkError } from '@/lib/api';

export default function SignInScreen() {
  const { signIn, t } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError) {
        // Message traduit par l'API (identifiants refusés, champ manquant, trop d'essais).
        setError(Object.values(e.errors)[0]?.[0] ?? e.message);
      } else if (e instanceof NetworkError) {
        setError(t('error.network'));
      } else {
        setError(t('error.unknown'));
      }
      setSubmitting(false);
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.form}>
          <ThemedText type="subtitle">{t('signIn.title')}</ThemedText>

          <ThemedText type="smallBold">{t('signIn.email')}</ThemedText>
          <TextInput
            testID="email"
            accessibilityLabel={t('signIn.email')}
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            editable={!submitting}
          />

          <ThemedText type="smallBold">{t('signIn.password')}</ThemedText>
          <TextInput
            testID="password"
            accessibilityLabel={t('signIn.password')}
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            editable={!submitting}
            onSubmitEditing={submit}
          />

          {error && (
            <ThemedText type="small" style={styles.error} accessibilityRole="alert">
              {error}
            </ThemedText>
          )}

          <Pressable
            testID="submit"
            accessibilityRole="button"
            onPress={submit}
            disabled={submitting || !email || !password}
            style={({ pressed }) => [
              styles.button,
              (submitting || !email || !password) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}>
            {submitting ? <ActivityIndicator color="#fff" /> : null}
            <ThemedText style={styles.buttonText}>
              {submitting ? t('signIn.submitting') : t('signIn.submit')}
            </ThemedText>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  form: { width: '100%', maxWidth: MaxContentWidth / 2, gap: Spacing.two },
  input: { borderRadius: 8, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  error: { color: '#d93025' },
  button: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: Spacing.three,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#fff' },
});
