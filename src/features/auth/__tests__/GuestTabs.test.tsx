import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import NotificationsTab from '@/app/(tabs)/notifications';
import ProfileTab from '@/app/(tabs)/profile/index';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

// Le menu du bas pour un visiteur (décisions 2026-11-27-visiteur-onglets et 2026-11-27-onglets-visiteur-invitation) :
// Notifications et Profil y montrent une invitation à se connecter.
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
let mockUser: { id: number } | null = null;
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, signIn: jest.fn(), t: (key: string) => key }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/welcome/components/LocaleSwitcher', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { LocaleSwitcher: () => <View testID="locale-switcher" /> };
});
jest.mock('@/features/notification/screens/NotificationsScreen', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { NotificationsScreen: () => <View testID="notifications-screen" /> };
});
jest.mock('@/features/auth/screens/ProfileScreen', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { ProfileScreen: () => <View testID="profile-screen" /> };
});

async function show(element: React.ReactElement) {
  await render(<I18nContext.Provider value={TEST_I18N}>{element}</I18nContext.Provider>);
}

describe('les onglets d’un visiteur (décision 2026-11-27-onglets-visiteur-invitation)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('visiteur : le titre de l’onglet, une invitation, « Se connecter ou s’inscrire » vers la connexion, la langue', async () => {
    mockUser = null;
    for (const [Tab, id, title] of [
      [NotificationsTab, 'guest-notifications', 'tabs.notifications'],
      [ProfileTab, 'guest-profile', 'tabs.profile'],
    ] as const) {
      await show(<Tab />);
      expect(screen.getByTestId(`${id}-title`)).toHaveTextContent(title);
      expect(screen.getByTestId(`${id}-message`)).toHaveTextContent(`auth.guest.${title.split('.')[1]}`);
      expect(screen.getByTestId(`${id}-sign-in`)).toHaveTextContent('auth.signInOrUp');
      expect(screen.getByTestId('locale-switcher')).toBeTruthy();
      expect(screen.queryByTestId('notifications-screen')).toBeNull();
      expect(screen.queryByTestId('profile-screen')).toBeNull();
      await fireEvent.press(screen.getByTestId(`${id}-sign-in`));
      expect(router.push).toHaveBeenLastCalledWith('/sign-in');
    }
  });

  it('membre : ses notifications et son profil', async () => {
    mockUser = { id: 1 };
    await show(<NotificationsTab />);
    expect(screen.getByTestId('notifications-screen')).toBeTruthy();
    await show(<ProfileTab />);
    expect(screen.getByTestId('profile-screen')).toBeTruthy();
    expect(screen.queryByTestId('guest-profile')).toBeNull();
  });
});
