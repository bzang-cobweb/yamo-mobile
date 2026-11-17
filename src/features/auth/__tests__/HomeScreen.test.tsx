import { render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import type { AuthContextValue, User } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});

const jeanne = {
  id: 1,
  name: 'jeanne',
  first_name: 'Jeanne',
  last_name: 'Dupont',
  full_name: 'Jeanne Dupont',
  initials: 'JD',
  avatar_url: null,
  locale: 'fr',
} as User;

describe('HomeScreen', () => {
  it("affiche le nom complet sous l'avatar, sans salutation", async () => {
    const auth = { user: jeanne, locale: 'fr', t: TEST_I18N.t } as AuthContextValue;

    await render(
      <AuthContext.Provider value={auth}>
        <HomeScreen />
      </AuthContext.Provider>,
    );

    expect(screen.getByTestId('home-full-name')).toHaveTextContent('Jeanne Dupont');
    expect(screen.queryByText(/Bonjour/)).toBeNull();
  });
});
