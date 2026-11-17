import type { PropsWithChildren } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { useFormDefinition } from '@/features/form/hooks/useFormDefinition';
import type { FormValues } from '@/features/form/types';
import { BackHeader } from '@/shared/components/BackHeader';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { useAuth } from '../hooks/useAuth';
import { profileFormService, profileSubmission, type ProfileSubmission } from '../services/ProfileFormService';
import type { Challenge } from '../types';
import { backToProfile } from '../utils/profile-notice';

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

/**
 * Écran de tout formulaire du profil (`/profile/[form]`), sans le connaître
 * d'avance : l'API en donne le titre, affiché dans l'en-tête, les champs et
 * l'envoi (méthode, point d'API, suite au succès ; décision
 * 2026-11-17-formulaires-profil-generiques).
 *
 * Selon la réponse : un code demandé → étape du code ; le compte renvoyé → mis à
 * jour (langue comprise) ; puis retour au profil avec le message, ou message et
 * déconnexion. Un formulaire sans envoi exécutable affiche une erreur et n'envoie rien.
 */
export function ProfileFormScreen({ form }: { form: string }) {
  const { t, setUser, signOut } = useAuth();
  const definition = useFormDefinition(form);
  const submission = definition.data ? profileSubmission(definition.data.submit) : null;

  async function succeed({ success }: ProfileSubmission) {
    if (success.action === 'sign-out') {
      Alert.alert(success.message);
      await signOut();
    } else {
      backToProfile(success.message);
    }
  }

  async function start(values: FormValues): Promise<Challenge | null> {
    if (submission === null) {
      return null;
    }

    const result = await profileFormService.submit(submission, values);

    if (result.kind === 'challenge') {
      return result.challenge;
    }

    if (result.kind === 'user') {
      setUser(result.user);
    }

    await succeed(submission);

    return null;
  }

  return (
    <ProfileScreenShell title={definition.data?.title ?? ''}>
      {definition.data && submission === null ? (
        <ThemedText style={styles.error} accessibilityRole="alert" testID="profile-form-unsupported">
          {t('error.unknown')}
        </ThemedText>
      ) : (
        <ChallengeFlow
          hideFormTitle
          form={form}
          start={start}
          onVerified={async (result) => {
            if (result.kind === 'user' && submission !== null) {
              setUser(result.user);
              await succeed(submission);
            }
          }}
        />
      )}
    </ProfileScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth / 2, alignSelf: 'center', gap: Spacing.three, padding: Spacing.four },
  error: { color: ERROR_COLOR, textAlign: 'center' },
});
