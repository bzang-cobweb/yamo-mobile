import { passwordService } from '../services/PasswordService';
import { ProfileFormScreen } from './ProfileFormScreen';

/** Changer le mot de passe (formulaire `auth.profile.password`). Cet appareil reste connecté. */
export function PasswordScreen() {
  return <ProfileFormScreen form="auth.profile.password" notice="password" onSubmit={(values) => passwordService.update(values)} />;
}
