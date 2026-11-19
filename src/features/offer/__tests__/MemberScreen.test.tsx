import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { MemberScreen } from '../screens/MemberScreen';
import { offerService } from '../services/OfferService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn(), useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <MemberScreen id="37" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('MemberScreen (décision 2026-11-19-page-membre)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sa photo ou ses initiales, son nom, « Membre depuis », sa présentation et ses informations', async () => {
    const member = jest.spyOn(offerService, 'member').mockResolvedValue({
      title: 'Profil',
      name: 'Paul Etoa',
      initials: 'PE',
      photo: null,
      since: 'Membre depuis mars 2026',
      description: 'Réalisateur de clips.',
      facts: [
        { label: 'Ville', value: 'Douala' },
        { label: 'Séjours', value: '2' },
      ],
    });
    await show();

    expect(await screen.findByTestId('member-name')).toHaveTextContent('Paul Etoa');
    expect(member).toHaveBeenCalledWith('37');
    expect(screen.getByText('Profil')).toBeTruthy();
    expect(screen.getByTestId('avatar-initials')).toHaveTextContent('PE');
    expect(screen.getByText('Membre depuis mars 2026')).toBeTruthy();
    expect(screen.getByTestId('member-description')).toHaveTextContent('Réalisateur de clips.');
    expect(screen.getByTestId('member-fact-Séjours')).toHaveTextContent('Séjours2');
  });

  it('une erreur propose de réessayer', async () => {
    jest.spyOn(offerService, 'member').mockRejectedValue(new Error('boom'));
    await show();

    expect(await screen.findByTestId('member-error')).toBeTruthy();
  });
});
