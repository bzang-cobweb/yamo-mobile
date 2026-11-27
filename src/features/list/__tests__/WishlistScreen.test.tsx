import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, StyleSheet, type AlertButton } from 'react-native';

import { AuthContext } from '@/features/auth/context/AuthContext';
import type { AuthContextValue } from '@/features/auth/types';
import { currentToast } from '@/shared/components/Toast';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { WISHLIST_LIST, WishlistScreen } from '../screens/WishlistScreen';
import type { ListDefinition, ListItem } from '../types';
import { resetFilters, setFilterValues, useListFilters } from '../utils/filters';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/list/components/FavoriteHeart', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { FavoriteHeart: ({ testID }: { testID?: string }) => <View testID={testID} /> };
});
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { back: jest.fn(), push: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
    // L'écran est considéré comme affiché : l'effet de focus s'exécute au montage.
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    useRootNavigationState: () => undefined,
    useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }),
  };
});

const mockRequest = jest.fn();
jest.mock('@/shared/api/ApiClient', () => ({ apiClient: { request: (...args: unknown[]) => mockRequest(...args) } }));

let mockList: ListDefinition | undefined;
const mockReload = jest.fn().mockResolvedValue(undefined);
const mockHookCalls: [string, Record<string, unknown> | undefined][] = [];
jest.mock('@/features/list/hooks/useListDefinition', () => ({
  useListDefinition: (name: string, _search?: string, filters?: Record<string, unknown>) => (mockHookCalls.push([name, filters]), {
    data: mockList,
    isPending: mockList === undefined,
    isError: false,
    refetch: jest.fn(),
    reload: mockReload,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

function offer(id: string, overrides: Partial<ListItem> = {}): ListItem {
  return {
    id,
    title: 'Location',
    subtitle: `Studio ${id}`,
    image: `http://api.test/${id}.webp`,
    rating: null,
    highlight: '35 000 FCFA / jour',
    link: `/offers/${id}`,
    edit: null,
    delete: null,
    ...overrides,
  };
}

/** Une liste nommée ouverte : son nom en titre, le menu ⋮ servi. */
function named(): ListDefinition {
  return {
    name: WISHLIST_LIST,
    title: 'Été',
    empty: 'Aucune offre.',
    create: null,
    search: null,
    next_cursor: null,
    items: [offer('7', { favorite: { active: true, endpoint: '/v1/offers/7/favorite' } })],
    header_actions: [
      { label: 'Renommer', style: 'default', confirm: null, submission: null, form: { form: 'offer.wishlist', record: '5' }, link: null },
      {
        label: 'Supprimer',
        style: 'destructive',
        confirm: 'Supprimer la liste « Été » ?',
        submission: { method: 'DELETE', endpoint: '/v1/wishlists/5', destructive: true, success: { action: 'back', message: 'Liste supprimée.' } },
        form: null,
        link: null,
      },
    ],
  };
}

/** « Récemment consultés » : deux cartes par ligne, une croix sur chaque photo, pas de menu. */
function recent(): ListDefinition {
  const cross = (id: string) => ({
    label: 'Retirer',
    confirm: 'Retirer cette offre de la liste ?',
    method: 'DELETE',
    endpoint: `/v1/wishlists/9/offers/${id}`,
    destructive: true,
    success: { action: 'back', message: 'Offre retirée de la liste.' },
    on_image: true,
  });

  return {
    name: WISHLIST_LIST,
    title: 'Récemment consultés',
    empty: 'Aucune offre.',
    create: null,
    search: null,
    next_cursor: null,
    columns: 2,
    items: [offer('11', { delete: cross('11') }), offer('12', { delete: cross('12') }), offer('13', { delete: cross('13') })],
  };
}

async function show(id = '5') {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <AuthContext.Provider value={{ t: TEST_I18N.t } as unknown as AuthContextValue}>
        <WishlistScreen id={id} />
      </AuthContext.Provider>
    </I18nContext.Provider>,
  );
}

describe('WishlistScreen (décision 2026-11-27-listes-de-favoris)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    resetFilters();
    mockHookCalls.length = 0;
  });

  it('la liste choisie part en filtre caché dès la première requête ; reposée si une autre liste l’a changée', async () => {
    mockList = named();
    await show('5');

    expect(mockHookCalls[0]).toEqual([WISHLIST_LIST, { wishlist: '5' }]);
    expect(screen.getByTestId('back-header-title')).toHaveTextContent('Été');

    // Une autre liste ouverte entre-temps : son filtre ; l'écran, rouvert, repose le sien.
    setFilterValues(WISHLIST_LIST, { wishlist: '6' });
    await show('5');
    const { result } = await renderHook(() => useListFilters(WISHLIST_LIST));
    expect(result.current.values).toEqual({ wishlist: '5' });
  });

  it('menu ⋮ de la barre du haut : « Renommer » ouvre son formulaire', async () => {
    mockList = named();
    await show();

    await fireEvent.press(screen.getByTestId('profile-list-header-menu-toggle'));
    expect(screen.getByTestId('profile-list-header-menu-list')).toHaveTextContent(/Renommer.*Supprimer/);
    await fireEvent.press(screen.getByTestId('profile-list-header-menu-header-0'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'offer.wishlist', record: '5' } });
  });

  it('« Supprimer » : confirmation, envoi, message, puis retour à « Mes favoris »', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });
    mockRequest.mockResolvedValue(undefined);
    mockList = named();
    await show();

    await fireEvent.press(screen.getByTestId('profile-list-header-menu-toggle'));
    await fireEvent.press(screen.getByTestId('profile-list-header-menu-header-1'));

    expect(alert).toHaveBeenCalledWith('Supprimer la liste « Été » ?', undefined, expect.any(Array));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith('/v1/wishlists/5', { method: 'DELETE', body: {} });
    expect(currentToast()).toMatchObject({ message: 'Liste supprimée.' });
  });

  it('« Récemment consultés » : deux cartes par ligne, sans menu ; la croix retire l’offre aussitôt, sans confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    mockRequest.mockResolvedValue(undefined);
    mockList = recent();
    await show('9');

    // Chaque carte dans sa demi-ligne.
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-row-11').parent?.props.style)).toMatchObject({ width: '50%' });
    expect(screen.queryByTestId('profile-list-header-menu-toggle')).toBeNull();
    // Pas de bouton « Retirer » sous la carte : la croix, sur la photo.
    expect(screen.queryByTestId('profile-list-delete-11')).toBeNull();
    expect(screen.getByTestId('profile-list-item-11-remove').props.accessibilityLabel).toBe('Retirer');

    await fireEvent.press(screen.getByTestId('profile-list-item-12-remove'));

    await waitFor(() => expect(mockReload).toHaveBeenCalled());
    expect(alert).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith('/v1/wishlists/9/offers/12', { method: 'DELETE', body: {} });
    expect(router.push).not.toHaveBeenCalled();
  });
});
