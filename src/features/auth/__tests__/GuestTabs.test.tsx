import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import NotificationsTab from '@/app/(tabs)/notifications';
import ProfileTab from '@/app/(tabs)/profile/index';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

// Le menu du bas pour un visiteur (décision 2026-11-27-visiteur-onglets) : Notifications et Profil y montrent la connexion.
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
let mockUser: { id: number } | null = null;
jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, signIn: jest.fn(), t: (key: string) => (key === 'auth.signIn' ? 'Se connecter' : key === 'auth.createAccount' ? 'Créer un compte' : key) }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/auth/components/ChallengeFlow', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { ChallengeFlow: () => <View testID="challenge-flow" /> };
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

describe('les onglets d’un visiteur (décision 2026-11-27-visiteur-onglets)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('visiteur : Notifications et Profil montrent la connexion, sans en-tête, avec la langue', async () => {
    mockUser = null;
    for (const Tab of [NotificationsTab, ProfileTab]) {
      await show(<Tab />);
      expect(screen.getByTestId('sign-in-title')).toHaveTextContent('Se connecter');
      expect(screen.getByTestId('challenge-flow')).toBeTruthy();
      expect(screen.getByTestId('locale-switcher')).toBeTruthy();
      expect(screen.queryByTestId('back-header')).toBeNull();
      expect(screen.queryByTestId('notifications-screen')).toBeNull();
      expect(screen.queryByTestId('profile-screen')).toBeNull();
    }
    // Créer un compte s'ouvre par-dessus l'onglet : le retour y ramène.
    await fireEvent.press(screen.getByTestId('sign-in-register'));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('membre : ses notifications et son profil', async () => {
    mockUser = { id: 1 };
    await show(<NotificationsTab />);
    expect(screen.getByTestId('notifications-screen')).toBeTruthy();
    await show(<ProfileTab />);
    expect(screen.getByTestId('profile-screen')).toBeTruthy();
    expect(screen.queryByTestId('sign-in-title')).toBeNull();
  });
});
