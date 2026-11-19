import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { OfferReviewsScreen } from '../screens/OfferReviewsScreen';
import { offerService } from '../services/OfferService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn() , useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});

function review(id: number) {
  return { id: String(id), author: `Auteur ${id}`, rating: 4, comment: `Avis ${id}`, created_at: '2026-11-19T09:00:00+00:00' };
}

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <OfferReviewsScreen id="7" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('OfferReviewsScreen (tous les avis, décision 2026-11-19-nuit-tous-les-avis)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('affiche les avis de la première page, puis la suivante en faisant défiler', async () => {
    const reviews = jest
      .spyOn(offerService, 'reviews')
      .mockResolvedValueOnce({ items: [review(3), review(2)], next_cursor: 'c2' })
      .mockResolvedValueOnce({ items: [review(1)], next_cursor: null });
    await show();

    await waitFor(() => expect(screen.getAllByTestId('offer-review')).toHaveLength(2));
    expect(reviews).toHaveBeenCalledWith('7', null);
    expect(screen.getByText('Avis 3')).toBeTruthy();

    await fireEvent(screen.getByTestId('offer-reviews-list'), 'onEndReached', { distanceFromEnd: 10 });
    await waitFor(() => expect(screen.getAllByTestId('offer-review')).toHaveLength(3));
    expect(reviews).toHaveBeenLastCalledWith('7', 'c2');
  });

  it('une erreur propose de réessayer', async () => {
    jest.spyOn(offerService, 'reviews').mockRejectedValue(new Error('boom'));
    await show();

    await waitFor(() => expect(screen.getByTestId('offer-reviews-error')).toBeTruthy());
    expect(screen.getByTestId('offer-reviews-retry')).toBeTruthy();
  });
});
