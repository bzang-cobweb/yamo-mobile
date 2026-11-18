import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { Text } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';
import type { Locale } from '@/shared/i18n/messages';

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

jest.mock('@/features/welcome/hooks/useApplication', () => ({
  useApplication: () => ({ data: { name: 'YaMo', description: 'Trouvez votre logement.' }, isPending: false }),
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

/** Langue modifiable comme dans l'app : `chooseLocale` change la langue courante. */
let mockLocaleChosen = false;

function I18n({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = React.useState<Locale>('fr');
  const [chosen, setChosen] = React.useState(mockLocaleChosen);

  return (
    <I18nContext.Provider
      value={{
        ...TEST_I18N,
        locale,
        localeChosen: chosen,
        chooseLocale: (code: string) => {
          mockChooseLocale(code);
          setLocale(code as Locale);
          setChosen(true);
        },
      }}>
      {children}
    </I18nContext.Provider>
  );
}

async function renderApp() {
  // gcTime infini : aucun minuteur de nettoyage ne garde jest ouvert.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await render(
    <QueryClientProvider client={client}>
      <I18n>
        <CountryProvider>
          <App />
        </CountryProvider>
      </I18n>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.queryByText('loading')).toBeNull());

  return { invalidate };
}

describe('Espace pays : écran d’entrée, mémoire, drapeau', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStored = null;
    mockLocaleChosen = false;
  });

  it('premier lancement : logo, description, sélecteurs ; un seul pays est montré choisi', async () => {
    mockCountries = [CAMEROON];
    await renderApp();

    expect(screen.getByTestId('entry-description').props.children).toBe('Trouvez votre logement.');
    expect(screen.getByTestId('entry-country').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    expect(screen.getByText('🇨🇲  Cameroun')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('entry-enter'));

    expect(screen.getByTestId('inside').props.children).toBe('CM');
    expect(mockSave).toHaveBeenCalledWith('CM');
    // La langue affichée devient un choix gardé.
    expect(mockChooseLocale).toHaveBeenCalledWith('fr');
    expect(mockSetCountry).toHaveBeenLastCalledWith('CM');
    expect(screen.getByTestId('country-flag').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('plusieurs pays : on cherche et choisit dans le sélecteur, puis on entre', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    await renderApp();

    expect(screen.getByTestId('entry-enter').props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));

    await fireEvent.press(screen.getByTestId('entry-country'));
    // Recherche proposée même avec deux pays.
    await fireEvent.changeText(screen.getByTestId('entry-country-search'), 'séné');
    expect(screen.queryByTestId('entry-country-option-CM')).toBeNull();
    await fireEvent.press(screen.getByTestId('entry-country-option-SN'));
    await fireEvent.press(screen.getByTestId('entry-enter'));

    expect(screen.getByTestId('inside').props.children).toBe('SN');
  });

  it('changer de langue avec le sélecteur de l’accueil garde le pays touché', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    await renderApp();

    await fireEvent.press(screen.getByTestId('entry-country'));
    await fireEvent.press(screen.getByTestId('entry-country-option-SN'));
    // Le sélecteur de langue de l'accueil, avec son icône.
    await waitFor(() => expect(screen.getByTestId('locale-switcher')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('locale-switcher'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('locale-option-en'));
    });

    expect(mockChooseLocale).toHaveBeenCalledWith('en');
    expect(screen.getByText('🇸🇳  Sénégal')).toBeTruthy();
  });

  it('pays et langue déjà choisis : on entre directement', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    mockStored = 'SN';
    mockLocaleChosen = true;
    await renderApp();

    expect(screen.getByTestId('inside').props.children).toBe('SN');
    expect(mockSetCountry).toHaveBeenLastCalledWith('SN');
  });

  it('pays gardé mais langue jamais choisie : l’écran d’entrée s’affiche', async () => {
    mockCountries = [CAMEROON];
    mockStored = 'CM';
    await renderApp();

    expect(screen.getByTestId('entry-screen')).toBeTruthy();
  });

  it('pays gardé fermé entre-temps : retour à l’écran d’entrée', async () => {
    mockCountries = [CAMEROON];
    mockStored = 'SN';
    mockLocaleChosen = true;
    await renderApp();

    expect(screen.getByTestId('entry-screen')).toBeTruthy();
  });

  it('le drapeau rouvre l’écran ; changer de pays recharge les données, sans toucher aux pays', async () => {
    mockCountries = [CAMEROON, SENEGAL];
    mockStored = 'CM';
    mockLocaleChosen = true;
    const { invalidate } = await renderApp();

    await fireEvent.press(screen.getByTestId('country-flag'));
    expect(screen.getByTestId('entry-screen')).toBeTruthy();
    // Le pays actuel est présélectionné.
    expect(screen.getByText('🇨🇲  Cameroun')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('entry-country'));
    await fireEvent.press(screen.getByTestId('entry-country-option-SN'));
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
    mockLocaleChosen = true;
    const { invalidate } = await renderApp();

    await fireEvent.press(screen.getByTestId('country-flag'));
    await fireEvent.press(screen.getByTestId('entry-enter'));

    expect(invalidate).not.toHaveBeenCalled();
  });
});
