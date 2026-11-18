import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { CountryFlag } from '../components/CountryFlag';
import { useCountry } from '../context/CountryContext';
import { CountryProvider } from '../providers/CountryProvider';
import { EntryScreen } from '../screens/EntryScreen';
import type { Country } from '../types';

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

const mockSetCountry = jest.fn();
jest.mock('@/shared/api/ApiClient', () => ({ apiClient: { setCountry: (code: string | null) => mockSetCountry(code) } }));

let mockCountries: Country[] = [];
jest.mock('../services/CountryService', () => ({ countryService: { list: () => Promise.resolve(mockCountries) } }));

let mockStored: string | null = null;
const mockSave = jest.fn();
jest.mock('../utils/country-storage', () => ({
  readChosenCountry: () => Promise.resolve(mockStored),
  saveChosenCountry: (code: string) => {
    mockSave(code);

    return Promise.resolve();
  },
}));

const mockChooseLocale = jest.fn();
jest.mock('@/shared/services/LocaleService', () => ({
  localeService: { list: () => Promise.resolve({ data: [{ code: 'fr', label: 'Français' }], default: 'fr' }) },
}));

const CAMEROON: Country = { code: 'CM', name: 'Cameroun', native_name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', dial_code: '+237' };
const SENEGAL: Country = { code: 'SN', name: 'Sénégal', native_name: 'Sénégal', flag: '🇸🇳', currency: 'XOF', dial_code: '+221' };

/** Ce que l'app afficherait : l'écran d'entrée tant qu'aucun pays, sinon l'app avec son drapeau. */
function App() {
  const { ready, country } = useCountry();

  if (!ready) {
    return <Text>loading</Text>;
  }

  return country === null ? (
    <EntryScreen showLanguage />
  ) : (
    <>
      <Text testID="inside">{country.code}</Text>
      <CountryFlag />
    </>
  );
}

async function renderApp() {
  // gcTime infini : aucun minuteur de nettoyage ne garde jest ouvert.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={{ ...TEST_I18N, chooseLocale: mockChooseLocale }}>
        <CountryProvider>
          <App />
        </CountryProvider>
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.queryByText('loading')).toBeNull());

  return { invalidate };
}

describe('Espace pays : écran d’entrée, mémoire, drapeau', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStored = null;
  });

  it('premier lancement avec un seul pays : l’écran d’entrée s’affiche quand même, pays choisi d’office', async () => {
    mockCountries = [CAMEROON];
    await renderApp();

    expect(screen.getByTestId('entry-screen')).toBeTruthy();
    expect(screen.getByTestId('entry-country-CM').props.accessibilityState).toEqual({ selected: true, disabled: true });
    await waitFor(() => expect(screen.getByTestId('entry-locale-fr')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('entry-enter'));

    expect(screen.getByTestId('inside').props.children).toBe('CM');
    expect(mockSave).toHaveBeenCalledWith('CM');
    expect(mockSetCountry).toHaveBeenLastCalledWith('CM');
    // Un seul pays : le drapeau n'est qu'un rappel.
    expect(screen.getByTestId('country-flag').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('plusieurs pays : il faut en choisir un pour entrer', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    await renderApp();

    expect(screen.getByTestId('entry-enter').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

    await fireEvent.press(screen.getByTestId('entry-country-SN'));
    await fireEvent.press(screen.getByTestId('entry-enter'));

    expect(screen.getByTestId('inside').props.children).toBe('SN');
  });

  it('lancement suivant : on entre directement dans le pays gardé', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    mockStored = 'SN';
    await renderApp();

    expect(screen.getByTestId('inside').props.children).toBe('SN');
    expect(mockSetCountry).toHaveBeenLastCalledWith('SN');
  });

  it('pays gardé fermé entre-temps : retour à l’écran d’entrée', async () => {
    mockCountries = [CAMEROON];
    mockStored = 'SN';
    await renderApp();

    expect(screen.getByTestId('entry-screen')).toBeTruthy();
  });

  it('le drapeau rouvre l’écran ; changer de pays recharge les données, sans toucher aux pays', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    mockStored = 'CM';
    const { invalidate } = await renderApp();

    await fireEvent.press(screen.getByTestId('country-flag'));
    expect(screen.getByTestId('entry-screen')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('entry-country-SN'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('entry-enter'));
    });

    expect(screen.getByTestId('inside').props.children).toBe('SN');
    expect(invalidate).toHaveBeenCalledTimes(1);
    const { predicate } = invalidate.mock.calls[0][0] as unknown as { predicate: (query: { queryKey: unknown[] }) => boolean };
    expect(predicate({ queryKey: ['list', 'offer.mine'] })).toBe(true);
    expect(predicate({ queryKey: ['countries', 'fr'] })).toBe(false);
  });

  it('rentrer dans le même pays ne recharge rien', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    mockStored = 'CM';
    const { invalidate } = await renderApp();

    await fireEvent.press(screen.getByTestId('country-flag'));
    await fireEvent.press(screen.getByTestId('entry-country-CM'));
    await fireEvent.press(screen.getByTestId('entry-enter'));

    expect(invalidate).not.toHaveBeenCalled();
  });
});
