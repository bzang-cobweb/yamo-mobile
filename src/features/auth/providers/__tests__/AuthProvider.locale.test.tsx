import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { readChosenLocale, saveChosenLocale } from '@/shared/i18n/locale-storage';

import { AuthProvider } from '../AuthProvider';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-localization', () => ({ useLocales: () => [{ languageTag: 'fr-CH' }] }));
jest.mock('@/shared/i18n/locale-storage', () => ({ readChosenLocale: jest.fn(), saveChosenLocale: jest.fn() }));
jest.mock('../../utils/token-storage', () => ({
  readToken: jest.fn().mockResolvedValue(null),
  saveToken: jest.fn(),
  clearToken: jest.fn(),
}));
jest.mock('@/shared/services/LocaleService', () => ({
  localeService: {
    list: jest.fn().mockResolvedValue({ data: [{ code: 'fr', label: 'Français' }, { code: 'en', label: 'English' }], default: 'fr' }),
  },
}));
jest.mock('@/shared/services/MessageService', () => ({ messageService: { get: jest.fn().mockResolvedValue({ locale: 'fr', messages: {} }) } }));

const readChosen = readChosenLocale as jest.Mock;
const saveChosen = saveChosenLocale as jest.Mock;

function Probe() {
  const { locale, chooseLocale } = useI18n();

  return (
    <Pressable testID="choose-en" onPress={() => chooseLocale('en')}>
      <Text testID="locale">{locale}</Text>
    </Pressable>
  );
}

async function renderProvider() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("AuthProvider : langue d'un invité", () => {
  beforeEach(() => jest.clearAllMocks());

  it("prend la langue de l'appareil quand aucune n'a été choisie", async () => {
    readChosen.mockResolvedValue(null);

    await renderProvider();

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('fr'));
  });

  it("garde la langue choisie d'un lancement à l'autre, avant celle de l'appareil", async () => {
    readChosen.mockResolvedValue('en');

    await renderProvider();

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
  });

  it('change de langue et la mémorise', async () => {
    readChosen.mockResolvedValue(null);
    saveChosen.mockResolvedValue(undefined);

    await renderProvider();
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('fr'));
    fireEvent.press(screen.getByTestId('choose-en'));

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'));
    expect(saveChosen).toHaveBeenCalledWith('en');
  });
});
