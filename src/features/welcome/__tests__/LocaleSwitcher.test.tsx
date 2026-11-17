import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { localeService } from '@/shared/services/LocaleService';

import { LocaleSwitcher } from '../components/LocaleSwitcher';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('@/shared/services/LocaleService', () => ({ localeService: { list: jest.fn() } }));

const list = localeService.list as jest.Mock;

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

  it("propose les langues de l'API, la langue courante marquée", async () => {
    list.mockResolvedValue({ data: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }], default: 'fr' });

    await renderSwitcher();

    expect(await screen.findByText('English')).toBeTruthy();
    expect(screen.getByTestId('locale-option-fr').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('locale-option-en').props.accessibilityState).toEqual({ selected: false });
  });

  it('change la langue au toucher', async () => {
    list.mockResolvedValue({ data: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }], default: 'fr' });

    const chooseLocale = await renderSwitcher();
    fireEvent.press(await screen.findByTestId('locale-option-en'));

    expect(chooseLocale).toHaveBeenCalledWith('en');
  });

  it("ne s'affiche pas avec une seule langue", async () => {
    list.mockResolvedValue({ data: [{ code: 'fr', label: 'Français' }], default: 'fr' });

    await renderSwitcher();

    await screen.findByTestId('locale-option-fr').catch(() => undefined);
    expect(screen.queryByTestId('locale-option-fr')).toBeNull();
  });
});
