import { ChallengeFlow } from '../components/ChallengeFlow';
import { useAuth } from '../hooks/useAuth';
import { phoneChangeService } from '../services/PhoneChangeService';
import { backToProfile, ProfileScreenShell } from './ProfileFormScreen';

/**
 * Ajouter ou changer son téléphone : numéro actuel en lecture seule (avec son
 * indicatif) et nouveau numéro (formulaire `auth.profile.phone`), puis le code reçu
 * par SMS. Le numéro n'est enregistré qu'une fois le code validé.
 */
export function PhoneChangeScreen() {
  const { setUser } = useAuth();

  return (
    <ProfileScreenShell>
      <ChallengeFlow
        form="auth.profile.phone"
        start={(values) => phoneChangeService.start(values)}
        onVerified={async (result) => {
          if (result.kind === 'user') {
            setUser(result.user);
            backToProfile('phone');
          }
        }}
      />
    </ProfileScreenShell>
  );
}
