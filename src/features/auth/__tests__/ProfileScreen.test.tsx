import { render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { AuthContextValue, User } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

let mockChannels = { email: true, phone: true };
jest.mock('@/features/welcome/hooks/useApplication', () => ({
  useApplication: () => ({ data: { name: 'Ya Mo', description: null, channels: mockChannels } }),
}));

const mockParams: { notice?: string } = {};
jest.mock('expo-router', () => ({
  router: { setParams: jest.fn(), back: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));

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
    delete mockParams.notice;
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

  it('au retour d’un formulaire enregistré, affiche la confirmation adaptée', async () => {
    mockParams.notice = 'password';
    await renderProfile();

    expect(screen.getByTestId('profile-notice')).toHaveTextContent('Mot de passe modifié.');
  });

  it('propose de changer l’e-mail présent et d’ajouter le numéro absent, et inversement', async () => {
    await renderProfile();

    expect(screen.getByTestId('profile-link-email')).toHaveTextContent("Changer d'adresse e-mail");
    expect(screen.getByTestId('profile-link-phone')).toHaveTextContent('Ajouter un numéro');

    await renderProfile({ ...jeanne, email: null, phone: '+41791234567', phone_international: '+41 79 123 45 67', phone_country: 'CH' });

    expect(screen.getByTestId('profile-link-email')).toHaveTextContent('Ajouter une adresse e-mail');
    expect(screen.getByTestId('profile-link-phone')).toHaveTextContent('Changer de numéro');
    expect(screen.getByTestId('profile-phone')).toHaveTextContent('+41 79 123 45 67');
  });

  it('au retour d’un changement d’e-mail ou de numéro, le confirme', async () => {
    mockParams.notice = 'phone';
    await renderProfile();

    expect(screen.getByTestId('profile-notice')).toHaveTextContent('Numéro enregistré.');
  });

  describe("selon les canaux de l'application", () => {
    afterEach(() => {
      mockChannels = { email: true, phone: true };
    });

    it("sans téléphone : ni numéro ni lien, même si le compte en a un", async () => {
      mockChannels = { email: true, phone: false };

      await renderProfile({ ...jeanne, phone: '+41791234567', phone_international: '+41 79 123 45 67', phone_country: 'CH' });

      expect(screen.queryByTestId('profile-phone')).toBeNull();
      expect(screen.queryByTestId('profile-link-phone')).toBeNull();
      expect(screen.getByTestId('profile-link-email')).toBeTruthy();
    });

    it("sans e-mail : ni adresse ni lien", async () => {
      mockChannels = { email: false, phone: true };

      await renderProfile();

      expect(screen.queryByTestId('profile-email')).toBeNull();
      expect(screen.queryByTestId('profile-link-email')).toBeNull();
      expect(screen.getByTestId('profile-link-phone')).toHaveTextContent('Ajouter un numéro');
    });
  });
});
