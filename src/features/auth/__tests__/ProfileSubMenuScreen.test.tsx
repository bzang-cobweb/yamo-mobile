import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { ProfileSubMenuScreen } from '../screens/ProfileSubMenuScreen';
import type { ProfileSubMenu } from '../types';

// Un sous-menu du profil (décision 2026-11-27-menu-profil-icones-sous-menus).
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
let mockSubMenu: ProfileSubMenu | undefined;
const mockRefetch = jest.fn();
jest.mock('../hooks/useProfileSubMenu', () => ({
  useProfileSubMenu: () => ({ data: mockSubMenu, refetch: mockRefetch }),
}));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

async function show() {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <ProfileSubMenuScreen menu="personal" />
    </I18nContext.Provider>,
  );
}

describe('ProfileSubMenuScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('le titre servi dans l’en-tête, les liens dans l’ordre avec leur icône ; un lien ouvre son formulaire', async () => {
    mockSubMenu = {
      title: 'Informations personnelles',
      data: [
        { key: 'details', label: 'Mes informations', form: 'auth.profile.personal', icon: { ios: 'person', android: 'person' } },
        { key: 'email', label: "Changer d'adresse e-mail", form: 'auth.profile.email', icon: { ios: 'envelope', android: 'mail' } },
      ],
    };
    await show();

    expect(screen.getByText('Informations personnelles')).toBeTruthy();
    expect(screen.getAllByTestId(/^profile-link-[a-z]+$/).map((link) => link.props.testID)).toEqual(['profile-link-details', 'profile-link-email']);
    expect(screen.getByTestId('profile-link-email-icon')).toBeTruthy();
    expect(mockRefetch).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('profile-link-email'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'auth.profile.email' } });
  });

  it('pendant le chargement : un indicateur, aucun lien', async () => {
    mockSubMenu = undefined;
    await show();

    expect(screen.getByTestId('profile-submenu-loading')).toBeTruthy();
    expect(screen.queryAllByTestId(/^profile-link-/)).toHaveLength(0);
  });
});
