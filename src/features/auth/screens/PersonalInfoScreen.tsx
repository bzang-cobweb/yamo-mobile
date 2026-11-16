import { useAuth } from '../hooks/useAuth';
import { personalInfoService } from '../services/PersonalInfoService';
import { ProfileFormScreen } from './ProfileFormScreen';

/** Informations personnelles : prénom et nom (formulaire `auth.profile.personal`). */
export function PersonalInfoScreen() {
  const { setUser } = useAuth();

  return (
    <ProfileFormScreen
      form="auth.profile.personal"
      notice="saved"
      onSubmit={async (values) => setUser(await personalInfoService.update(values))}
    />
  );
}
