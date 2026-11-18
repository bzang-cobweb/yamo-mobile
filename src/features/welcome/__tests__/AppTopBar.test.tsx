import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CountryContext, type CountryContextValue } from '@/features/country/context/CountryContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { AppTopBar } from '../components/AppTopBar';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});
jest.mock('@/shared/services/LocaleService', () => ({
  localeService: {
    list: () =>
      Promise.resolve({
        data: [
          { code: 'fr', label: 'Français' },
          { code: 'en', label: 'English' },
        ],
        default: 'fr',
      }),
  },
}));

const CAMEROON = { code: 'CM', name: 'Cameroun', native_name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', dial_code: '+237' };

describe('AppTopBar', () => {
  it('logo à gauche, puis la langue et le drapeau du pays', async () => {
    const country = { country: CAMEROON, countries: [CAMEROON], canChange: false } as unknown as CountryContextValue;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

    await render(
      <QueryClientProvider client={client}>
        <I18nContext.Provider value={TEST_I18N}>
          <CountryContext.Provider value={country}>
            <AppTopBar />
          </CountryContext.Provider>
        </I18nContext.Provider>
      </QueryClientProvider>,
    );

    const logo = screen.getByTestId('app-top-bar-logo');
    expect(logo.props.accessibilityLabel).toBe('YaMo');
    await waitFor(() => expect(screen.getByTestId('locale-switcher')).toBeTruthy());
    expect(screen.getByText('🇨🇲')).toBeTruthy();
  });
});
