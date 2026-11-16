import { ChallengeFlow } from '../components/ChallengeFlow';
import { useAuth } from '../hooks/useAuth';
import { emailChangeService } from '../services/EmailChangeService';
import { backToProfile, ProfileScreenShell } from './ProfileFormScreen';

/**
 * Ajouter ou changer son e-mail : adresse actuelle en lecture seule et nouvelle
 * adresse (formulaire `auth.profile.email`), puis le code envoyé à la nouvelle
 * adresse. Elle n'est enregistrée qu'une fois le code validé.
 */
export function EmailChangeScreen() {
  const { setUser, t, user } = useAuth();

  return (
    <ProfileScreenShell title={user?.email ? t('profile.changeEmail') : t('profile.addEmail')}>
      <ChallengeFlow
        hideFormTitle
        form="auth.profile.email"
        start={(values) => emailChangeService.start(values)}
        onVerified={async (result) => {
          if (result.kind === 'user') {
            setUser(result.user);
            backToProfile('email');
          }
        }}
      />
    </ProfileScreenShell>
  );
}
