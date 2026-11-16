import { useAuth } from '../hooks/useAuth';
import { preferencesService } from '../services/PreferencesService';
import { ProfileFormScreen } from './ProfileFormScreen';

/** Préférences : langue (formulaire `auth.profile.preferences`). L'app bascule aussitôt dans la nouvelle langue. */
export function PreferencesScreen() {
  const { setUser } = useAuth();

  return (
    <ProfileFormScreen
      form="auth.profile.preferences"
      notice="saved"
      onSubmit={async (values) => setUser(await preferencesService.update(values))}
    />
  );
}
