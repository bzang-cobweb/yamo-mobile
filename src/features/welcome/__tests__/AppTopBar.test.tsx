import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AppTopBar } from '../components/AppTopBar';
import { applicationService } from '../services/ApplicationService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
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

async function renderBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <AppTopBar />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('AppTopBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it("affiche le logo de l'application", async () => {
    get.mockResolvedValue({ name: 'Ya Mo', logo_url: 'http://api.test/logo.png', description: null });

    await renderBar();

    const logo = await screen.findByTestId('app-top-bar-logo');
    expect(logo.props.accessibilityLabel).toBe('Ya Mo');
    expect(screen.queryByTestId('app-top-bar-name')).toBeNull();
  });

  it("affiche le nom de l'application quand il n'y a pas de logo", async () => {
    get.mockResolvedValue({ name: 'Ya Mo', logo_url: null, description: null });

    await renderBar();

    expect(await screen.findByText('Ya Mo')).toBeTruthy();
    expect(screen.queryByTestId('app-top-bar-logo')).toBeNull();
  });
});
