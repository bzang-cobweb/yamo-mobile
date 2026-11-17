import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { DELETE_ACCOUNT_FORM } from '../components/DeleteAccountLink';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { AuthContextValue, User } from '../types';
import { backToProfile, takeProfileNotice } from '../utils/profile-notice';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

let mockChannels = { email: true, phone: true };
jest.mock('@/features/welcome/hooks/useApplication', () => ({
  useApplication: () => ({ data: { name: 'Ya Mo', description: null, channels: mockChannels } }),
}));

type MenuItem = { key: string; label: string; form: string };

const DEFAULT_MENU: MenuItem[] = [
  { key: 'personal', label: 'Informations personnelles', form: 'auth.profile.personal' },
  { key: 'email', label: "Changer d'adresse e-mail", form: 'auth.profile.email' },
  { key: 'phone', label: 'Ajouter un numéro', form: 'auth.profile.phone' },
  { key: 'password', label: 'Changer le mot de passe', form: 'auth.profile.password' },
  { key: 'preferences', label: 'Préférences', form: 'auth.profile.preferences' },
];
let mockMenu: MenuItem[] | undefined = DEFAULT_MENU;
const mockRefetch = jest.fn();
jest.mock('../hooks/useProfileMenu', () => ({
  useProfileMenu: () => ({ data: mockMenu, refetch: mockRefetch }),
}));

// L'écran est considéré comme affiché : l'effet de focus s'exécute au montage.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

const jeanne: User = {
  id: 1,
  name: 'jeanne',
  first_name: 'Jeanne',
  last_name: 'Dupont',
  full_name: 'Jeanne Dupont',
  initials: 'JD',
  gender: 'female',
  birth_date: null,
  country: null,
  region: null,
  description: null,
  email: 'jeanne@example.com',
  phone: null,
  phone_international: null,
  phone_country: null,
  last_seen_at: null,
  is_online: true,
  locale: 'fr',
  avatar_url: null,
};

async function renderProfile(user: User = jeanne) {
  const auth = {
    isLoading: false,
    offline: false,
    isRetrying: false,
    retry: jest.fn(),
    user,
    locale: 'fr',
    t: TEST_I18N.t,
    signIn: jest.fn(),
    signOut: jest.fn(),
    setUser: jest.fn(),
  } as AuthContextValue;

  await render(
    <AuthContext.Provider value={auth}>
      <ProfileScreen />
    </AuthContext.Provider>,
  );
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeProfileNotice();
    mockMenu = DEFAULT_MENU;
  });

  it('affiche la photo, le nom complet, l’e-mail, les trois liens et la déconnexion', async () => {
    await renderProfile();

    expect(screen.getByTestId('avatar-picker')).toBeTruthy();
    expect(screen.getByTestId('profile-full-name')).toHaveTextContent('Jeanne Dupont');
    expect(screen.getByTestId('profile-email')).toHaveTextContent('jeanne@example.com');
    expect(screen.getByTestId('profile-link-personal')).toHaveTextContent('Informations personnelles');
    expect(screen.getByTestId('profile-link-password')).toHaveTextContent('Changer le mot de passe');
    expect(screen.getByTestId('profile-link-preferences')).toHaveTextContent('Préférences');
    expect(screen.getByTestId('sign-out')).toHaveTextContent('Se déconnecter');
    expect(screen.getByTestId('profile-delete-account')).toHaveTextContent('Supprimer mon compte');
    expect(screen.queryByTestId('profile-notice')).toBeNull();
    expect(screen.queryByText('Profil')).toBeNull();
    expect(screen.queryByTestId('profile-phone')).toBeNull();
  });

  it('au retour d’un formulaire enregistré, affiche le message servi par l’API, une seule fois', async () => {
    backToProfile('Mot de passe modifié.');
    await renderProfile();

    expect(router.dismissTo).toHaveBeenCalledWith('/profile');
    expect(screen.getByTestId('profile-notice')).toHaveTextContent('Mot de passe modifié.');
    expect(takeProfileNotice()).toBeNull();
  });

  it('affiche le menu servi par l’API, dans son ordre et avec ses libellés', async () => {
    mockMenu = [
      { key: 'preferences', label: 'Préférences', form: 'auth.profile.preferences' },
      { key: 'email', label: 'Ajouter une adresse e-mail', form: 'auth.profile.email' },
    ];
    await renderProfile();

    const menuLinks = screen.getAllByTestId(/^profile-link-/);
    expect(menuLinks.map((link) => link.props.testID)).toEqual(['profile-link-preferences', 'profile-link-email']);
    expect(screen.getByTestId('profile-link-email')).toHaveTextContent('Ajouter une adresse e-mail');
    expect(screen.queryByTestId('profile-link-personal')).toBeNull();
  });

  it('ouvre le formulaire servi par l’API, même pour un lien que l’app ne connaît pas', async () => {
    mockMenu = [{ key: 'notifications', label: 'Notifications', form: 'notifications.settings' }];
    await renderProfile();

    await fireEvent.press(screen.getByTestId('profile-link-notifications'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'notifications.settings' } });
  });

  it('ignore un lien sans formulaire (réponse d’un serveur plus ancien)', async () => {
    mockMenu = [
      { key: 'legacy', label: 'Sans formulaire', path: '/profile/legacy' } as unknown as MenuItem,
      { key: 'empty', label: 'Vide', form: '' },
      { key: 'password', label: 'Changer le mot de passe', form: 'auth.profile.password' },
    ];
    await renderProfile();

    expect(screen.queryByText('Sans formulaire')).toBeNull();
    expect(screen.queryByText('Vide')).toBeNull();
    expect(screen.getByTestId('profile-link-password')).toBeTruthy();
  });

  it('le lien rouge ouvre le formulaire de suppression du compte', async () => {
    await renderProfile();

    await fireEvent.press(screen.getByTestId('profile-delete-account'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: DELETE_ACCOUNT_FORM } });
  });

  it('sans menu (chargement, erreur) : aucun lien, mais déconnexion et suppression restent', async () => {
    mockMenu = undefined;
    await renderProfile();

    expect(screen.queryAllByTestId(/^profile-link-/)).toHaveLength(0);
    expect(screen.getByTestId('sign-out')).toBeTruthy();
    expect(screen.getByTestId('profile-delete-account')).toBeTruthy();
  });

  it('affiche le numéro au format international', async () => {
    await renderProfile({ ...jeanne, email: null, phone: '+41791234567', phone_international: '+41 79 123 45 67', phone_country: 'CH' });

    expect(screen.getByTestId('profile-phone')).toHaveTextContent('+41 79 123 45 67');
  });

  describe("selon les canaux de l'application", () => {
    afterEach(() => {
      mockChannels = { email: true, phone: true };
    });

    it("sans téléphone : pas de numéro, même si le compte en a un", async () => {
      mockChannels = { email: true, phone: false };

      await renderProfile({ ...jeanne, phone: '+41791234567', phone_international: '+41 79 123 45 67', phone_country: 'CH' });

      expect(screen.queryByTestId('profile-phone')).toBeNull();
      expect(screen.getByTestId('profile-email')).toBeTruthy();
    });

    it("sans e-mail : pas d'adresse", async () => {
      mockChannels = { email: false, phone: true };

      await renderProfile();

      expect(screen.queryByTestId('profile-email')).toBeNull();
    });
  });
});
