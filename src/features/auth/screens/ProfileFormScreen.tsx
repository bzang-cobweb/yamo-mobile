import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';
import { BackHeader } from '@/shared/components/BackHeader';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';


/** Confirmation affichée par le profil au retour d'un formulaire enregistré. */
export type ProfileNotice = 'saved' | 'password' | 'email' | 'phone';

/** Revient au profil, qui affiche la confirmation `notice`. */
export function backToProfile(notice: ProfileNotice) {
  router.dismissTo({ pathname: '/profile', params: { notice } });
}

/**
 * Mise en page d'un écran du profil : en-tête fixé en haut (flèche de retour, titre de
 * l'écran au centre), contenu qui défile dessous, au-dessus du clavier.
 */
export function ProfileScreenShell({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={title} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </BackStackProvider>
      </SafeAreaView>
    </ThemedView>
  );
}

type Props = {
  /** Titre de l'écran, au centre de l'en-tête (le formulaire n'affiche plus le sien). */
  title: string;
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
export function ProfileFormScreen({ title, form, onSubmit, notice }: Props) {
  async function submit(values: FormValues) {
    await onSubmit(values);
    backToProfile(notice);
  }

  return (
    <ProfileScreenShell title={title}>
      <FormLoader name={form} onSubmit={submit} hideTitle />
    </ProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.three, padding: Spacing.four },
});
