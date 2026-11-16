import { passwordService } from '../services/PasswordService';
import { useAuth } from '../hooks/useAuth';
import { ProfileFormScreen } from './ProfileFormScreen';

/** Changer le mot de passe (formulaire `auth.profile.password`). Cet appareil reste connecté. */
export function PasswordScreen() {
  const { t } = useAuth();

  return <ProfileFormScreen title={t('profile.password')} form="auth.profile.password" notice="password" onSubmit={(values) => passwordService.update(values)} />;
}
