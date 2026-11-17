import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { WelcomeScreen } from '../screens/WelcomeScreen';
import { applicationService } from '../services/ApplicationService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});
jest.mock('../services/ApplicationService', () => ({ applicationService: { get: jest.fn() } }));

const get = applicationService.get as jest.Mock;

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <WelcomeScreen />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('WelcomeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('affiche le nom sans logo, la description et les deux boutons', async () => {
    get.mockResolvedValue({ name: 'yamo', logo_url: null, description: 'Bienvenue' });
    await renderScreen();

    expect(await screen.findByTestId('welcome-name')).toHaveTextContent('yamo');
    expect(screen.queryByTestId('welcome-logo')).toBeNull();
    expect(screen.getByTestId('welcome-description')).toHaveTextContent('Bienvenue');

    await fireEvent.press(screen.getByTestId('welcome-sign-in'));
    expect(router.push).toHaveBeenCalledWith('/sign-in');
    await fireEvent.press(screen.getByTestId('welcome-sign-up'));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
  });

  it('affiche le logo à la place du nom, sans description si elle est vide', async () => {
    get.mockResolvedValue({ name: 'yamo', logo_url: 'http://api.test/storage/app/logo/x/logo.png', description: null });
    await renderScreen();

    expect(await screen.findByTestId('welcome-logo')).toBeTruthy();
    expect(screen.queryByTestId('welcome-name')).toBeNull();
    expect(screen.queryByTestId('welcome-description')).toBeNull();
  });
});
