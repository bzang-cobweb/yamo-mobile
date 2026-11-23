import { fireEvent, render, renderHook, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { ListItem } from '@/features/list/types';
import { useListFilters } from '@/features/list/utils/filters';
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
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
let mockState: { data?: HomeCarousel[]; isPending: boolean; isError: boolean; error: unknown } = { isPending: true, isError: false, error: null };
const mockRefetch = jest.fn();
jest.mock('../hooks/useHomeCarousels', () => ({ useHomeCarousels: () => ({ ...mockState, refetch: mockRefetch }) }));

function item(id: string, title: string): ListItem {
  return { id, title, subtitle: `Logement ${id}`, image: null, rating: { average: 4, count: 3 }, highlight: '35 000 FCFA / jour', favorite: null, link: `/offers/${id}`, edit: null, actions: [], tag: null, counter: null, delete: null } as unknown as ListItem;
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
    // Plus petites que dans la recherche : une police réduite (décision 2026-11-23-accueil-deux-cartes).
    expect(StyleSheet.flatten(screen.getByText('Location meublée · Studio · Douala').props.style)).toMatchObject({ fontSize: 11 });
    // Sans retrait : le texte a la largeur de la photo (décision 2026-11-23-accueil-texte-sans-retrait).
    expect(StyleSheet.flatten(screen.getByTestId('home-item-1-body').props.style)).toMatchObject({ paddingHorizontal: 0 });
    // Les étoiles de la note aussi.
    expect(StyleSheet.flatten(within(screen.getByTestId('home-item-1-rating')).getAllByText(/★/)[0].parent?.props.style)).toMatchObject({ fontSize: 10 });
    expect(screen.getByTestId('home-carousel-Yaoundé')).toHaveTextContent(/^Yaoundé/);

    await fireEvent.press(screen.getByTestId('home-item-3'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '3' } });
  });

  it('« Voir tout » ouvre la recherche filtrée sur la ville (décision 2026-11-23-accueil-voir-tout)', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ city: 'Douala', items: [item('1', 'Studio · Douala')] }] };
    await show();

    // Une flèche, sans texte ; « Voir tout » pour les lecteurs d'écran (décision 2026-11-23-accueil-fleche).
    expect(screen.getByTestId('home-see-all-Douala')).toHaveTextContent('');
    expect(screen.getByLabelText('Voir tout Douala')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-see-all-Douala'));

    expect(router.navigate).toHaveBeenCalledWith('/search');
    const { result } = await renderHook(() => useListFilters('offer.browse'));
    expect(result.current.values).toEqual({ city: 'Douala' });
  });

  it('un nouveau tirage repart du début de la rangée', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ city: 'Douala', items: [item('1', 'A'), item('2', 'B'), item('3', 'C')] }] };
    await show();

    mockState = { ...mockState, data: [{ city: 'Douala', items: [item('4', 'D'), item('5', 'E'), item('6', 'F')] }] };
    await screen.rerender(
      <I18nContext.Provider value={TEST_I18N}>
        <HomeScreen />
      </I18nContext.Provider>,
    );

    // Le nouveau tirage remplace l'ancien (la rangée, clé du tirage, est montée de nouveau et part du début).
    expect(screen.queryByTestId('home-item-1')).toBeNull();
    expect(screen.getByTestId('home-item-4')).toBeTruthy();
  });

  it('une erreur propose de réessayer', async () => {
    mockState = { isPending: false, isError: true, error: new Error('boom') };
    await show();

    await fireEvent.press(screen.getByTestId('home-retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
