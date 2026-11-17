import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

  it('affiche le logo YaMo, la description et les deux boutons', async () => {
    get.mockResolvedValue({ name: 'Ya Mo', description: 'Bienvenue', channels: { email: true, phone: true } });
    await renderScreen();

    expect(await screen.findByTestId('welcome-description')).toHaveTextContent('Bienvenue');
    expect(screen.getByTestId('welcome-logo').props.accessibilityLabel).toBe('YaMo');

    await fireEvent.press(screen.getByTestId('welcome-sign-in'));
    expect(router.push).toHaveBeenCalledWith('/sign-in');
    await fireEvent.press(screen.getByTestId('welcome-sign-up'));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
  });

  it('affiche le logo avant la réponse de l’API, sans description si elle est vide', async () => {
    get.mockResolvedValue({ name: 'Ya Mo', description: null, channels: { email: true, phone: true } });
    await renderScreen();

    expect(screen.getByTestId('welcome-logo')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('welcome-loading')).toBeNull());
    expect(screen.queryByTestId('welcome-description')).toBeNull();
  });
});
