import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

/** Confirmation affichée par le profil au retour d'un formulaire enregistré. */
export type ProfileNotice = 'saved' | 'password';

type Props = {
  /** Nom du formulaire dans l'API (`auth.profile.personal`…). */
  form: string;
  /** Envoi par le service du formulaire ; une erreur de l'API reste affichée dans le formulaire. */
  onSubmit: (values: FormValues) => Promise<void>;
  notice: ProfileNotice;
};

/**
 * Écran d'un formulaire du profil : retour, formulaire décrit par l'API (titre
 * compris). Enregistré, il revient au profil avec une confirmation.
 */
export function ProfileFormScreen({ form, onSubmit, notice }: Props) {
  const { t } = useAuth();

  async function submit(values: FormValues) {
    await onSubmit(values);
    router.dismissTo({ pathname: '/profile', params: { notice } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Pressable accessibilityRole="link" testID="profile-form-back" onPress={() => router.back()}>
              <ThemedText type="linkPrimary">← {t('profile.back')}</ThemedText>
            </Pressable>
            <FormLoader name={form} onSubmit={submit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.three, padding: Spacing.four },
});
