import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { BackHeader } from '@/shared/components/BackHeader';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { useAuth } from '../hooks/useAuth';

/** Confirmation affichée par le profil au retour d'un formulaire enregistré. */
export type ProfileNotice = 'saved' | 'password' | 'email' | 'phone';

/** Revient au profil, qui affiche la confirmation `notice`. */
export function backToProfile(notice: ProfileNotice) {
  router.dismissTo({ pathname: '/profile', params: { notice } });
}

/**
 * Mise en page d'un écran du profil : en-tête « ← Profil » fixé en haut, contenu qui
 * défile dessous, au-dessus du clavier.
 */
export function ProfileScreenShell({ children }: PropsWithChildren) {
  const { t } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <BackHeader label={t('profile.title')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

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
  async function submit(values: FormValues) {
    await onSubmit(values);
    backToProfile(notice);
  }

  return (
    <ProfileScreenShell>
      <FormLoader name={form} onSubmit={submit} />
    </ProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.three, padding: Spacing.four },
});
