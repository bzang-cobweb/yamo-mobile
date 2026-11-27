import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { AuthContextValue, User } from '../types';
import { currentToast, hideToast } from '@/shared/components/Toast';

import { backToProfile } from '../utils/profile-notice';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

let mockChannels = { email: true, phone: true };
jest.mock('@/features/welcome/hooks/useApplication', () => ({
  useApplication: () => ({ data: { name: 'Ya Mo', description: null, channels: mockChannels } }),
}));

type MenuItem = import('../types').ProfileMenuItem;

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
    hideToast();
    mockMenu = DEFAULT_MENU;
  });

  it('affiche la photo, le nom complet, l’e-mail, les liens et la déconnexion', async () => {
    await renderProfile();

    expect(screen.getByTestId('avatar-picker')).toBeTruthy();
    expect(screen.getByTestId('profile-full-name')).toHaveTextContent('Jeanne Dupont');
    expect(screen.getByTestId('profile-email')).toHaveTextContent('jeanne@example.com');
    expect(screen.getByTestId('profile-link-personal')).toHaveTextContent('Informations personnelles');
    expect(screen.getByTestId('profile-link-password')).toHaveTextContent('Changer le mot de passe');
    expect(screen.getByTestId('profile-link-preferences')).toHaveTextContent('Préférences');
    expect(screen.getByTestId('sign-out')).toHaveTextContent('Se déconnecter');
    // « Supprimer mon compte » est dans « Confidentialité » (décision 2026-11-27-confidentialite).
    expect(screen.queryByTestId('profile-delete-account')).toBeNull();
    expect(screen.queryByText('Profil')).toBeNull();
    expect(screen.queryByTestId('profile-phone')).toBeNull();
  });

  it('au retour d’un formulaire enregistré, le message servi par l’API est dans le bandeau (décision 2026-11-21-bandeau-messages)', async () => {
    backToProfile('Mot de passe modifié.');
    await renderProfile();

    expect(router.dismissTo).toHaveBeenCalledWith('/profile');
    expect(currentToast()).toMatchObject({ message: 'Mot de passe modifié.', tone: 'success' });
    expect(screen.queryByText('Mot de passe modifié.')).toBeNull();
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

  it('ouvre la liste servie par l’API pour un lien `list`', async () => {
    mockMenu = [{ key: 'addresses', label: 'Mes adresses', list: 'auth.addresses' }];
    await renderProfile();

    await fireEvent.press(screen.getByTestId('profile-link-addresses'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/lists/[list]', params: { list: 'auth.addresses' } });
  });

  it('une seule liste, sans titre de groupe, dans l’ordre servi (décision 2026-11-21-menu-profil-sans-groupes)', async () => {
    const account = { key: 'account', label: 'Compte' };
    const traveler = { key: 'traveler', label: 'Voyageur' };
    mockMenu = [
      { key: 'personal', label: 'Informations personnelles', form: 'auth.profile.personal', group: account },
      { key: 'addresses', label: 'Mes adresses', list: 'auth.addresses', group: account },
      { key: 'bookings', label: 'Mes réservations', list: 'offer.bookings', group: traveler },
      { key: 'offers', label: 'Mes logements', list: 'offer.mine', group: { key: 'host', label: 'Hôte' } },
    ];
    await renderProfile();

    expect(screen.queryByText('Compte')).toBeNull();
    expect(screen.queryByText('Voyageur')).toBeNull();
    expect(screen.queryByText('Hôte')).toBeNull();
    const json = JSON.stringify(screen.toJSON());
    const order = ['personal', 'addresses', 'bookings', 'offers'].map((key) => json.indexOf(`profile-link-${key}`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('ignore un lien sans formulaire (réponse d’un serveur plus ancien)', async () => {
    mockMenu = [
      { key: 'legacy', label: 'Sans formulaire', path: '/profile/legacy' } as unknown as MenuItem,
      { key: 'empty', label: 'Vide', form: '' },
      { key: 'empty-list', label: 'Liste vide', list: '' },
      { key: 'password', label: 'Changer le mot de passe', form: 'auth.profile.password' },
    ];
    await renderProfile();

    expect(screen.queryByText('Sans formulaire')).toBeNull();
    expect(screen.queryByText('Vide')).toBeNull();
    expect(screen.queryByText('Liste vide')).toBeNull();
    expect(screen.getByTestId('profile-link-password')).toBeTruthy();
  });

  it('un lien `menu` ouvre son sous-menu ; l’icône servie précède le libellé (décision 2026-11-27-menu-profil-icones-sous-menus)', async () => {
    mockMenu = [
      { key: 'personal', label: 'Informations personnelles', menu: 'personal', icon: { ios: 'person', android: 'person' } },
      { key: 'preferences', label: 'Préférences', form: 'auth.profile.preferences' },
    ];
    await renderProfile();

    expect(screen.getByTestId('profile-link-personal-icon')).toBeTruthy();
    expect(screen.queryByTestId('profile-link-preferences-icon')).toBeNull();
    await fireEvent.press(screen.getByTestId('profile-link-personal'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/menu/[menu]', params: { menu: 'personal' } });
  });

  it('sans menu (chargement, erreur) : aucun lien, mais la déconnexion reste', async () => {
    mockMenu = undefined;
    await renderProfile();

    expect(screen.queryAllByTestId(/^profile-link-/)).toHaveLength(0);
    expect(screen.getByTestId('sign-out')).toBeTruthy();
  });

  it('affiche le numéro au format international', async () => {
    await renderProfile({ ...jeanne, email: null, phone: '+41791234567', phone_international: '+41 79 123 45 67', phone_country: 'CH' });

    expect(screen.getByTestId('profile-phone')).toHaveTextContent('+41 79 123 45 67');
  });

  it('affiche l’e-mail et le numéro masqués servis par l’API (décision 2026-11-27-email-telephone-masques)', async () => {
    await renderProfile({ ...jeanne, email_masked: 'j•••@example.com', phone: '+41791234567', phone_international: '+41 79 123 45 67', phone_masked: '+41 ••• 67', phone_country: 'CH' });

    expect(screen.getByTestId('profile-email')).toHaveTextContent('j•••@example.com');
    expect(screen.getByTestId('profile-phone')).toHaveTextContent('+41 ••• 67');
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
