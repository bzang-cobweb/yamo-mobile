import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { ListDefinition } from '@/features/list/types';
import { resetFilters, setFilterValues, useListFilters } from '@/features/list/utils/filters';
import type { FormFieldDefinition } from '@/features/form/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { BrowseScreen } from '../screens/BrowseScreen';
import { GuestHomeScreen } from '../screens/GuestHomeScreen';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
// L'icône rendue comme une vue, pour la trouver par son testID (l'épingle des régions).
jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const { createElement } = jest.requireActual<typeof import('react')>('react');

  return { SymbolView: ({ testID }: { testID?: string }) => createElement(View, { testID }) };
});
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockClick = jest.fn().mockResolvedValue(undefined);
jest.mock('../services/OfferService', () => ({ offerService: { click: (...args: unknown[]) => mockClick(...args) } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }) };
});
// La barre du haut a ses propres tests.
jest.mock('@/features/welcome/components/LocaleSwitcher', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { LocaleSwitcher: () => <View testID="locale-switcher" /> };
});
jest.mock('@/features/welcome/components/AppTopBar', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { AppTopBar: () => <View testID="app-top-bar" /> };
});

let mockList: ListDefinition | undefined;
const mockCalls: [string, string | undefined][] = [];
const mockFetchNextPage = jest.fn().mockResolvedValue(undefined);
jest.mock('@/features/list/hooks/useListDefinition', () => ({
  useListDefinition: (name: string, search?: string) => (
    mockCalls.push([name, search]),
    {
      data: mockList,
      isPending: mockList === undefined,
      isError: false,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      reload: jest.fn().mockResolvedValue(undefined),
      refetch: jest.fn(),
    }
  ),
}));

function list(): ListDefinition {
  return {
    name: 'offer.browse',
    title: 'Logements',
    empty: 'Aucune offre publiée dans ce pays pour l’instant.',
    create: null,
    search: 'Rechercher par titre…',
    next_cursor: 'c2',
    items: [
      {
        id: '9',
        title: 'Maison - Yaoundé',
        subtitle: 'Maison à Bastos',
        image: 'https://api.test/storage/9.jpg',
        rating: { average: 4.5, count: 12 },
        highlight: '4 chambres · 400 000 FCFA / mois',
        edit: null,
        delete: null,
      },
      { id: '7', title: 'Studio à Akwa', subtitle: null, image: null, rating: null, highlight: '25 000 FCFA / mois', edit: null, delete: null },
    ],
  };
}

async function show(element: React.ReactElement) {
  await render(<I18nContext.Provider value={TEST_I18N}>{element}</I18nContext.Provider>);
}

describe('Accueil : offres du pays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalls.length = 0;
    mockList = list();
  });

  it('montre la vitrine du pays : titre, titre saisi, prix ; pas de champ de recherche (décision 2026-11-25-recherche-sans-champ)', async () => {
    await show(<BrowseScreen />);

    expect(mockCalls[0][0]).toBe('offer.browse');
    expect(screen.getByText('Maison - Yaoundé')).toBeTruthy();
    expect(screen.getByText('Maison à Bastos')).toBeTruthy();
    expect(screen.getByText('25 000 FCFA / mois')).toBeTruthy();
    expect(screen.queryByTestId('browse-list-search')).toBeNull();
  });

  it('la photo au-dessus du titre ; sans photo, un emplacement neutre', async () => {
    await show(<BrowseScreen />);

    expect(screen.getByTestId('browse-item-9-photo').props.source).toEqual({ uri: 'https://api.test/storage/9.jpg' });
    expect(screen.getByTestId('browse-item-7-photo-empty')).toBeTruthy();
    // La photo est le premier élément de la carte, avant le titre.
    expect(screen.getByTestId('browse-item-9').children[0]).toBe(screen.getByTestId('browse-item-9-photo'));
  });

  it('détails et prix en gras, puis les étoiles seules dessous, à droite ; sans avis, pas d’étoiles', async () => {
    await show(<BrowseScreen />);

    const rating = screen.getByTestId('browse-item-9-rating');
    expect(rating.props.accessibilityLabel).toBe('Note moyenne 4,5 sur 5, 12 avis');
    // Les étoiles seules : ni la note ni le nombre d'avis en texte.
    expect(screen.queryByText('4,5 (12)')).toBeNull();
    const highlight = screen.getByTestId('browse-item-9-highlight');
    expect(highlight.props.children).toBe('4 chambres · 400 000 FCFA / mois');
    expect(highlight.props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(highlight.props.style).fontWeight).toBe(700);
    // Sous le prix, sur leur ligne, à droite (décision 2026-11-21-accueil-note-sous-le-prix).
    expect(StyleSheet.flatten(rating.props.style).alignSelf).toBe('flex-end');
    expect(StyleSheet.flatten(screen.getByTestId('browse-item-9-reviews').props.style).flexDirection).toBeUndefined();

    expect(screen.queryByTestId('browse-item-7-rating')).toBeNull();
    // Sous la photo, une zone en retrait (décision 2026-11-22-cartes-espace-sous-photo).
    expect(StyleSheet.flatten(screen.getByTestId('browse-item-9-body').props.style)).toMatchObject({ paddingHorizontal: 8, paddingVertical: 4 });
    expect(screen.getByTestId('browse-item-7-highlight').props.children).toBe('25 000 FCFA / mois');
  });

  it('un cœur sur la photo quand l’API en sert un (membre connecté) ; aucun sinon', async () => {
    mockList = {
      ...list(),
      items: [{ ...list().items[0], favorite: { active: true, endpoint: '/v1/offers/9/favorite' } }, list().items[1]],
    };
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nContext.Provider value={TEST_I18N}>
          <BrowseScreen />
        </I18nContext.Provider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('browse-item-9-favorite').props.accessibilityLabel).toBe('Retirer des favoris');
    expect(screen.queryByTestId('browse-item-7-favorite')).toBeNull();
  });

  it('toucher une offre ouvre sa fiche', async () => {
    await show(<BrowseScreen />);

    await fireEvent.press(screen.getByTestId('browse-item-7'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '7' } });
    // La carte ne compte pas le clic : la fiche le fait (décision 2026-11-25-clic-a-l-ouverture).
    expect(mockClick).not.toHaveBeenCalled();
  });

  it('le sélecteur de région en premier, avant la recherche ; le changer filtre la recherche (décision 2026-11-25-region-en-tete-recherche)', async () => {
    const region = { name: 'region', type: 'select', label: 'Région', placeholder: null, help: null, required: true, default: '27', all_option: false, country_scoped: true, options: [{ value: '27', label: 'Centre' }, { value: '34', label: 'Littoral' }] } as FormFieldDefinition;
    const city = { name: 'city', type: 'select', label: 'Ville', placeholder: null, help: null, required: false, default: null, depends_on: 'region', country_scoped: true, options: [{ value: 'Yaoundé', label: 'Yaoundé', parent: '27' }] } as FormFieldDefinition;
    const rentalType = { name: 'rental_type', type: 'select', label: 'Type', placeholder: null, help: null, required: false, default: null, options: [{ value: 'furnished', label: 'Meublé' }] } as FormFieldDefinition;
    mockList = { ...list(), filters: [region, city, rentalType] };
    await show(<BrowseScreen />);

    // En premier dans la zone fixe, sur la région par défaut.
    const bar = screen.getByTestId('browse-list-bar');
    expect(bar.children[0]).toBe(screen.getByTestId('browse-region'));
    expect(screen.getByTestId('browse-region-label')).toHaveTextContent('Région');
    expect(screen.getByTestId('browse-region-value')).toHaveTextContent('Centre');

    // Une ville choisie dans la région, puis une autre région : la ville s'efface (décision 2026-11-25-ville-selon-region).
    setFilterValues('offer.browse', { region: '27', city: 'Yaoundé', rental_type: 'furnished' });
    await fireEvent.press(screen.getByTestId('field-region'));
    // Une épingle devant chaque région (décision 2026-11-25-region-icone).
    expect(screen.getByTestId('field-region-option-27-icon')).toBeTruthy();
    expect(screen.getByTestId('field-region-option-34-icon')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('field-region-option-34'));
    expect(screen.getByTestId('browse-region-value')).toHaveTextContent('Littoral');
    const { result } = await renderHook(() => useListFilters('offer.browse'));
    expect(result.current.values).toEqual({ region: '34', rental_type: 'furnished' });
    resetFilters();
  });

  it('« Filtres » ouvre les filtres dans un panneau qui monte du bas ; « Appliquer » le ferme (décision 2026-11-25-filtres-en-panneau)', async () => {
    const rentalType = { name: 'rental_type', type: 'select', label: 'Type', placeholder: null, help: null, required: false, default: null, options: [{ value: 'furnished', label: 'Meublé' }] } as FormFieldDefinition;
    mockList = { ...list(), filters: [rentalType] };
    await show(<BrowseScreen />);
    expect(screen.queryByTestId('filter-sheet')).toBeNull();

    await fireEvent.press(screen.getByTestId('browse-list-filter'));

    // Pas un autre écran : le panneau, par-dessus la recherche.
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('filter-sheet')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('field-rental_type'));
    await fireEvent.press(screen.getByTestId('field-rental_type-option-furnished'));
    await fireEvent.press(screen.getByTestId('filter-apply'));
    expect(screen.queryByTestId('filter-sheet')).toBeNull();

    // « Fermer » le ferme sans rien changer.
    await fireEvent.press(screen.getByTestId('browse-list-filter'));
    await fireEvent.press(screen.getByTestId('filter-sheet-close'));
    expect(screen.queryByTestId('filter-sheet')).toBeNull();
    const { result } = await renderHook(() => useListFilters('offer.browse'));
    expect(result.current.values).toEqual({ rental_type: 'furnished' });
    resetFilters();
  });

  it('le nombre d’offres trouvées en tête (décision 2026-11-25-recherche-nombre)', async () => {
    mockList = { ...list(), heading: { title: '12 logements', subtitle: null } };
    await show(<BrowseScreen />);

    expect(screen.getByTestId('browse-heading')).toHaveTextContent('12 logements');
    // Centré (décision 2026-11-25-nombre-centre).
    expect(StyleSheet.flatten(screen.getByTestId('browse-heading').props.style)).toMatchObject({ textAlign: 'center' });
  });

  it('charge la suite en approchant du bas', async () => {
    await show(<BrowseScreen />);

    await fireEvent(screen.getByTestId('browse-list'), 'onEndReached', { distanceFromEnd: 10 });

    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('vide : le texte servi par l’API', async () => {
    mockList = { ...list(), items: [] };
    await show(<BrowseScreen />);

    expect(screen.getByTestId('browse-list-empty').props.children).toBe('Aucune offre publiée dans ce pays pour l’instant.');
  });

  it('visiteur : barre du haut, offres, et en bas se connecter ou créer un compte', async () => {
    await show(<GuestHomeScreen />);

    expect(screen.getByTestId('app-top-bar')).toBeTruthy();
    // La langue, en bas, après les boutons.
    expect(screen.getByTestId('locale-switcher')).toBeTruthy();
    expect(screen.getByText('Studio à Akwa')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('welcome-sign-in'));
    expect(router.push).toHaveBeenCalledWith('/sign-in');
    await fireEvent.press(screen.getByTestId('welcome-sign-up'));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
  });
});
