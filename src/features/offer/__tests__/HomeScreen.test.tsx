import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { ListItem } from '@/features/list/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { HomeScreen } from '../screens/HomeScreen';
import type { HomeCarousel } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
let mockState: { data?: HomeCarousel[]; isPending: boolean; isError: boolean; error: unknown } = { isPending: true, isError: false, error: null };
const mockRefetch = jest.fn();
jest.mock('../hooks/useHomeCarousels', () => ({ useHomeCarousels: () => ({ ...mockState, refetch: mockRefetch }) }));

function item(id: string, title: string): ListItem {
  return { id, title, subtitle: `Logement ${id}`, image: null, rating: null, highlight: '35 000 FCFA / jour', favorite: null, link: `/offers/${id}`, edit: null, actions: [], tag: null, counter: null, delete: null } as unknown as ListItem;
}

async function show() {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <HomeScreen />
    </I18nContext.Provider>,
  );
}

// Décision 2026-11-23-accueil-carrousels-par-ville.
describe('HomeScreen', () => {
  it('un carrousel par ville, le nom de la ville au-dessus, ses offres en cartes qui ouvrent leur fiche', async () => {
    mockState = {
      isPending: false,
      isError: false,
      error: null,
      data: [
        { city: 'Douala', items: [item('1', 'Location meublée · Studio · Douala'), item('2', 'Location · Maison · Douala')] },
        { city: 'Yaoundé', items: [item('3', 'Location · Appartement · Yaoundé')] },
      ],
    };
    await show();

    expect(screen.getByTestId('home-carousel-Douala')).toHaveTextContent(/^Douala/);
    expect(screen.getByTestId('home-item-1')).toHaveTextContent(/Location meublée · Studio · Douala/);
    expect(screen.getByTestId('home-item-2')).toBeTruthy();
    expect(screen.getByTestId('home-carousel-Yaoundé')).toHaveTextContent(/^Yaoundé/);

    await fireEvent.press(screen.getByTestId('home-item-3'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '3' } });
  });

  it('une erreur propose de réessayer', async () => {
    mockState = { isPending: false, isError: true, error: new Error('boom') };
    await show();

    await fireEvent.press(screen.getByTestId('home-retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
