import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { localeService } from '@/shared/services/LocaleService';

import { LocaleSwitcher } from '../components/LocaleSwitcher';

// Les panneaux qui montent du bas (`BottomSheet`), dont la fenêtre de choix : leurs marges de fenêtre.
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/shared/services/LocaleService', () => ({ localeService: { list: jest.fn() } }));

const list = localeService.list as jest.Mock;
const THREE = { data: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }], default: 'fr' };

async function renderSwitcher(chooseLocale = jest.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={{ ...TEST_I18N, chooseLocale }}>
        <LocaleSwitcher />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );

  return chooseLocale;
}

describe('LocaleSwitcher', () => {
  beforeEach(() => jest.clearAllMocks());

  it('affiche la langue courante dans une liste déroulante unique', async () => {
    list.mockResolvedValue(THREE);

    await renderSwitcher();

    expect(await screen.findByTestId('locale-switcher')).toHaveTextContent('Français');
    expect(screen.queryByText('Deutsch')).toBeNull();
  });

  it("ouvre la liste des langues de l'API et change de langue au choix", async () => {
    list.mockResolvedValue(THREE);

    const chooseLocale = await renderSwitcher();
    fireEvent.press(await screen.findByTestId('locale-switcher'));
    expect((await screen.findByTestId('locale-option-fr')).props.accessibilityState).toEqual({ selected: true });
    fireEvent.press(screen.getByTestId('locale-option-de'));

    expect(chooseLocale).toHaveBeenCalledWith('de');
  });

  it("ne s'affiche pas avec une seule langue", async () => {
    list.mockResolvedValue({ data: [{ code: 'fr', label: 'Français' }], default: 'fr' });

    await renderSwitcher();

    await screen.findByTestId('locale-switcher').catch(() => undefined);
    expect(screen.queryByTestId('locale-switcher')).toBeNull();
  });
});
