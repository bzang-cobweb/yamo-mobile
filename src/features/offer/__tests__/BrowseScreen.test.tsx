import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { ListDefinition } from '@/features/list/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { BrowseScreen } from '../screens/BrowseScreen';
import { GuestHomeScreen } from '../screens/GuestHomeScreen';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});
// La barre du haut a ses propres tests.
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
      { id: '9', title: 'Maison à Bastos', subtitle: '400 000 FCFA · Yaoundé', image: 'https://api.test/storage/9.jpg', edit: null, delete: null },
      { id: '7', title: 'Studio à Akwa', subtitle: '25 000 FCFA · Douala', image: null, edit: null, delete: null },
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

  it('montre la vitrine du pays : titre, prix et ville, recherche', async () => {
    await show(<BrowseScreen />);

    expect(mockCalls[0][0]).toBe('offer.browse');
    expect(screen.getByText('Maison à Bastos')).toBeTruthy();
    expect(screen.getByText('25 000 FCFA · Douala')).toBeTruthy();
    expect(screen.getByTestId('browse-list-search').props.placeholder).toBe('Rechercher par titre…');
  });

  it('la photo au-dessus du titre ; sans photo, un emplacement neutre', async () => {
    await show(<BrowseScreen />);

    expect(screen.getByTestId('browse-item-9-photo').props.source).toEqual({ uri: 'https://api.test/storage/9.jpg' });
    expect(screen.getByTestId('browse-item-7-photo-empty')).toBeTruthy();
    // La photo est le premier élément de la carte, avant le titre.
    expect(screen.getByTestId('browse-item-9').children[0]).toBe(screen.getByTestId('browse-item-9-photo'));
  });

  it('toucher une offre ouvre sa fiche', async () => {
    await show(<BrowseScreen />);

    await fireEvent.press(screen.getByTestId('browse-item-7'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]', params: { id: '7' } });
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
    expect(screen.getByText('Studio à Akwa')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('welcome-sign-in'));
    expect(router.push).toHaveBeenCalledWith('/sign-in');
    await fireEvent.press(screen.getByTestId('welcome-sign-up'));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
  });
});
