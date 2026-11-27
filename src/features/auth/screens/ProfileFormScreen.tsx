import type { PropsWithChildren } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ERROR_COLOR } from '@/features/form/components/FieldShell';
import { useFormDefinition } from '@/features/form/hooks/useFormDefinition';
import type { FormValues } from '@/features/form/types';
import { BackHeader } from '@/shared/components/BackHeader';
import { FixedFooterLayout } from '@/shared/components/FixedFooterLayout';
import { BackStackProvider } from '@/shared/navigation/BackStack';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { ThemedView } from '@/shared/theme/components/themed-view';
import { MaxContentWidth, Spacing } from '@/shared/theme/theme';

import { ChallengeFlow } from '../components/ChallengeFlow';
import { useAuth } from '../hooks/useAuth';
import { profileFormService, profileSubmission, type ProfileSubmission } from '../services/ProfileFormService';
import type { Challenge } from '../types';
import { backToProfile, backWithNotice } from '../utils/profile-notice';

/**
 * Mise en page d'un écran du profil : en-tête fixé en haut (flèche de retour, titre de
 * l'écran au centre), contenu qui défile dessous, au-dessus du clavier, et la barre
 * fixe du bouton d'envoi en bas.
 *
 * `scrolls={false}` : le contenu défile lui-même (une `List`), qui ne peut pas
 * être placée dans un `ScrollView` ; il reprend alors `profileContentStyle`.
 */
export function ProfileScreenShell({ title, scrolls = true, children }: PropsWithChildren<{ title: string; scrolls?: boolean }>) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <BackStackProvider>
          <BackHeader title={title} />
          <View style={styles.safeArea}>
            {scrolls ? (
              // Un formulaire y place son bouton, fixé en bas ; le menu du bas est masqué
              // (décision 2026-11-19-contrat-bouton-fixe-formulaires).
              <FixedFooterLayout contentStyle={styles.content} bottomInset>
                {children}
              </FixedFooterLayout>
            ) : (
              <View style={styles.safeArea}>{children}</View>
            )}
          </View>
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
 * Après l'envoi : retour au profil avec le message, ou retour à la liste d'où il a été ouvert.
 *
 * `record` : formulaire ouvert depuis un item d'une liste (décision
 * 2026-11-18-adresses-liste-generique), prérempli avec cet enregistrement.
 */
export function ProfileFormScreen({ form, record }: { form: string; record?: string }) {
  const definition = useFormDefinition(form, record);

  return (
    // La barre du haut : le titre de navigation, sinon le titre (décision 2026-11-22-formulaire-titre-navigation).
    <ProfileScreenShell title={formTitle(definition.data)}>
      <ProfileForm
        form={form}
        record={record}
        onDone={({ action, message }) => (action === 'back' ? backWithNotice(message) : backToProfile(message))}
      />
    </ProfileScreenShell>
  );
}

/** Le titre d'un formulaire dans une barre : son titre de navigation, sinon son titre. */
export function formTitle(definition: { navigation_title?: string | null; title?: string | null } | undefined): string {
  return definition?.navigation_title || definition?.title || '';
}

/**
 * Le contenu d'un formulaire du profil, sans cadre : un écran (`ProfileFormScreen`) ou un panneau
 * (`ProfileFormSheet`) le pose dans le sien (décision 2026-11-26-formulaires-en-panneau).
 *
 * Selon la réponse : un code demandé → étape du code ; le compte renvoyé → mis à
 * jour (langue comprise) ; « sign-out » → message et déconnexion ; sinon `onDone`, à qui
 * revient la suite (revenir en arrière, fermer le panneau). Un formulaire sans envoi
 * exécutable affiche une erreur et n'envoie rien.
 */
export function ProfileForm({ form, record, onDone }: { form: string; record?: string; onDone: (success: ProfileSubmission['success']) => void }) {
  const { t, setUser, signOut } = useAuth();
  const definition = useFormDefinition(form, record);
  const submission = definition.data ? profileSubmission(definition.data.submit) : null;

  async function succeed({ success }: ProfileSubmission) {
    if (success.action === 'sign-out') {
      Alert.alert(success.message);
      await signOut();
    } else {
      onDone(success);
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

  return definition.data && submission === null ? (
    <ThemedText style={styles.error} accessibilityRole="alert" testID="profile-form-unsupported">
      {t('error.unknown')}
    </ThemedText>
  ) : (
    <ChallengeFlow
      hideFormTitle
      form={form}
      record={record}
      start={start}
      onVerified={async (result) => {
        if (result.kind === 'user' && submission !== null) {
          // Un compte supprimé (suite « sign-out ») n'est pas remis dans l'app : elle se déconnecte (décision
          // 2026-11-27-confidentialite).
          if (submission.success.action !== 'sign-out') {
            setUser(result.user);
          }
          await succeed(submission);
        }
      }}
    />
  );
}

/** Marges et largeur du contenu d'un écran du profil. */
export const profileContentStyle = {
  width: '100%',
  maxWidth: MaxContentWidth / 2,
  alignSelf: 'center',
  padding: Spacing.four,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { ...profileContentStyle, gap: Spacing.three },
  error: { color: ERROR_COLOR, textAlign: 'center' },
});
