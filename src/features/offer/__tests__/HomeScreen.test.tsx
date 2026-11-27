import { fireEvent, render, renderHook, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { ListItem } from '@/features/list/types';
import { useListFilters } from '@/features/list/utils/filters';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { HomeScreen } from '../screens/HomeScreen';
import type { HomeCarousel, HomeRecent } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  // L'écran est au premier plan : l'effet part une fois monté.
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));
const mockClick = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/OfferService', () => ({ offerService: { click: (...args: unknown[]) => mockClick(...args) } }));
let mockState: { data?: HomeCarousel[]; isPending: boolean; isError: boolean; error: unknown } = { isPending: true, isError: false, error: null };
const mockRefetch = jest.fn();
jest.mock('@/features/partner/hooks/usePartners', () => ({ usePartners: () => ({ data: { partners: [], become: null }, refetch: jest.fn() }) }));
let mockFeatured: ListItem[] = [];
let mockRecent: HomeRecent | null = null;
const mockReloadRecent = jest.fn().mockResolvedValue(undefined);
jest.mock('../hooks/useHomeRecent', () => ({ useHomeRecent: () => ({ data: mockRecent, reload: mockReloadRecent }) }));
jest.mock('../hooks/useHomeCarousels', () => ({
  useHomeCarousels: () => ({ ...mockState, refetch: mockRefetch }),
  useHomeFeatured: () => ({ data: mockFeatured }),
}));

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
        { title: 'Douala', filter: { region: '34' }, items: [item('1', 'Location meublée · Studio · Douala'), item('2', 'Location · Maison · Douala')] },
        { title: 'Yaoundé', filter: { region: '34' }, items: [item('3', 'Location · Appartement · Yaoundé')] },
      ],
    };
    await show();

    expect(screen.getByTestId('home-carousel-Douala')).toHaveTextContent(/^Douala/);
    expect(screen.getByTestId('home-item-1')).toHaveTextContent(/Location meublée · Studio · Douala/);
    expect(screen.getByTestId('home-item-2')).toBeTruthy();
    // Plus petites que dans la recherche : une police réduite (décision 2026-11-23-accueil-deux-cartes).
    expect(StyleSheet.flatten(screen.getByText('Location meublée · Studio · Douala').props.style)).toMatchObject({ fontSize: 10 });
    // Sans retrait : le texte a la largeur de la photo (décision 2026-11-23-accueil-texte-sans-retrait).
    expect(StyleSheet.flatten(screen.getByTestId('home-item-1-body').props.style)).toMatchObject({ paddingHorizontal: 0 });
    // Les étoiles de la note aussi.
    expect(StyleSheet.flatten(within(screen.getByTestId('home-item-1-rating')).getAllByText(/★/)[0].props.style)).toMatchObject({ fontSize: 9 });
    expect(screen.getByTestId('home-carousel-Yaoundé')).toHaveTextContent(/^Yaoundé/);

    await fireEvent.press(screen.getByTestId('home-item-3'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '3' } });
    // La recherche reprend la région de ce carrousel (décision 2026-11-25-carte-choisit-region).
    const { result } = await renderHook(() => useListFilters('offer.browse'));
    expect(result.current.values).toEqual({ region: '34' });
    // La carte ne compte pas le clic : la fiche le fait (décision 2026-11-25-clic-a-l-ouverture).
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('« À la une » en haut, avant les villes, sans carrousel : les cartes des villes, toutes visibles (décision 2026-11-25-bloc-a-la-une)', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('1', 'Studio · Douala')] }] };
    mockFeatured = [item('7', 'Villa · Bonapriso'), item('8', 'Duplex · Akwa'), item('9', 'Studio · Bali')];
    await show();

    expect(screen.getByTestId('home-featured')).toHaveTextContent(/^À la une/);
    expect(screen.getAllByTestId(/^home-(featured|carousel-[^-]+)$/).map((element) => element.props.testID)).toEqual(['home-featured', 'home-carousel-Douala']);
    // Pas de liste qui défile : une grille, deux par ligne.
    expect(StyleSheet.flatten(screen.getByTestId('home-featured-grid').props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap' });
    expect(within(screen.getByTestId('home-featured-grid')).getByTestId('home-featured-item-9')).toBeTruthy();
    // La taille et la police des cartes des villes.
    const featuredWidth = StyleSheet.flatten(screen.getByTestId('home-featured-item-7').props.style).width;
    expect(featuredWidth).toBe(StyleSheet.flatten(screen.getByTestId('home-item-1').props.style).width);
    expect(StyleSheet.flatten(screen.getByText('Villa · Bonapriso').props.style)).toMatchObject({ fontSize: 10 });
    expect(screen.getByTestId('home-featured-item-9')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('home-featured-item-8'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '8' } });
  });

  it('sans offre « À la une » : pas de bloc', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('1', 'Studio · Douala')] }] };
    mockFeatured = [];
    await show();

    expect(screen.queryByTestId('home-featured')).toBeNull();
  });

  it('« Voir tout » ouvre la recherche filtrée sur la région (décisions 2026-11-23-accueil-voir-tout et 2026-11-25-region-de-l-adresse)', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('1', 'Studio · Douala')] }] };
    await show();

    // Une flèche, sans texte ; « Voir tout » pour les lecteurs d'écran (décision 2026-11-23-accueil-fleche).
    expect(screen.getByTestId('home-see-all-Douala')).toHaveTextContent('');
    expect(screen.getByLabelText('Voir tout Douala')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-see-all-Douala'));

    expect(router.navigate).toHaveBeenCalledWith('/search');
    const { result } = await renderHook(() => useListFilters('offer.browse'));
    // Le filtre servi avec le carrousel : sa région (décision 2026-11-25-region-de-l-adresse).
    expect(result.current.values).toEqual({ region: '34' });
  });

  it('un nouveau tirage repart du début de la rangée', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('1', 'A'), item('2', 'B'), item('3', 'C')] }] };
    await show();

    mockState = { ...mockState, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('4', 'D'), item('5', 'E'), item('6', 'F')] }] };
    await screen.rerender(
      <I18nContext.Provider value={TEST_I18N}>
        <HomeScreen />
      </I18nContext.Provider>,
    );

    // Le nouveau tirage remplace l'ancien (la rangée, clé du tirage, est montée de nouveau et part du début).
    expect(screen.queryByTestId('home-item-1')).toBeNull();
    expect(screen.getByTestId('home-item-4')).toBeTruthy();
  });

  it('« Récemment consultés » avant « À la une », en rangée qui défile ; la flèche ouvre la liste entière (décision 2026-11-27-listes-de-favoris)', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('1', 'Studio · Douala')] }] };
    mockFeatured = [item('7', 'Villa · Bonapriso')];
    mockRecent = { title: 'Récemment consultés', link: '/wishlists/5', items: [item('11', 'Studio · Akwa'), item('12', 'Duplex · Bali')] };
    mockReloadRecent.mockClear();
    await show();

    expect(screen.getAllByTestId(/^home-(recent|featured|carousel-[^-]+)$/).map((element) => element.props.testID)).toEqual(['home-recent', 'home-featured', 'home-carousel-Douala']);
    expect(screen.getByTestId('home-recent')).toHaveTextContent(/^Récemment consultés/);
    expect(screen.getByTestId('home-recent-item-12')).toBeTruthy();
    // Rechargé à chaque retour sur l'accueil : une fiche ouverte entre-temps.
    expect(mockReloadRecent).toHaveBeenCalled();
    expect(screen.getByLabelText('Voir tout Récemment consultés')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-recent-see-all'));
    expect(router.push).toHaveBeenCalledWith('/wishlists/5');
    await fireEvent.press(screen.getByTestId('home-recent-item-11'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '11' } });
  });

  it('sans offre consultée (ou pour un visiteur) : pas de bloc « Récemment consultés »', async () => {
    mockState = { isPending: false, isError: false, error: null, data: [{ title: 'Douala', filter: { region: '34' }, items: [item('1', 'Studio · Douala')] }] };
    mockRecent = null;
    await show();

    expect(screen.queryByTestId('home-recent')).toBeNull();
  });

  it('une erreur propose de réessayer', async () => {
    mockState = { isPending: false, isError: true, error: new Error('boom') };
    await show();

    await fireEvent.press(screen.getByTestId('home-retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
