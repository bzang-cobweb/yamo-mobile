import { render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { AuthContextValue, User } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

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
  email: 'jeanne@example.com',
  phone: null,
  phone_country: null,
  last_seen_at: null,
  is_online: true,
  locale: 'fr',
  avatar_url: null,
};

async function renderProfile() {
  const auth = {
    isLoading: false,
    offline: false,
    isRetrying: false,
    retry: jest.fn(),
    user: jeanne,
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
    expect(screen.queryByTestId('profile-notice')).toBeNull();
  });

  it('au retour d’un formulaire enregistré, affiche la confirmation adaptée', async () => {
    mockParams.notice = 'password';
    await renderProfile();

    expect(screen.getByTestId('profile-notice')).toHaveTextContent('Mot de passe modifié.');
  });
});
