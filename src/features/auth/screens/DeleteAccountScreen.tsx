import { Alert } from 'react-native';

import { FormLoader } from '@/features/form/components/FormLoader';
import type { FormValues } from '@/features/form/types';

import { useAuth } from '../hooks/useAuth';
import { accountDeletionService } from '../services/AccountDeletionService';
import { ProfileScreenShell } from './ProfileFormScreen';

/**
 * Supprimer son compte (formulaire `auth.profile.delete-account`) : avertissement
 * et mot de passe, servis par l'API ; bouton rouge. Supprimé, l'app oublie la
 * session et revient à l'écran d'accueil, après une confirmation.
 */
export function DeleteAccountScreen() {
  const { t, signOut } = useAuth();

  async function submit(values: FormValues) {
    await accountDeletionService.delete(values);
    Alert.alert(t('auth.accountDeleted'));
    await signOut();
  }

  return (
    <ProfileScreenShell title={t('profile.deleteAccount')}>
      <FormLoader name="auth.profile.delete-account" onSubmit={submit} hideTitle destructive />
    </ProfileScreenShell>
  );
}
