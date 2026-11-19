import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import type { ListDefinition, ListItem } from '@/features/list/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileListScreen } from '../screens/ProfileListScreen';
import type { AuthContextValue } from '../types';
import { backWithNotice, takeProfileNotice } from '../utils/profile-notice';

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

// L'écran est considéré comme affiché : l'effet de focus s'exécute au montage.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});

const mockRequest = jest.fn();
jest.mock('@/shared/api/ApiClient', () => ({ apiClient: { request: (...args: unknown[]) => mockRequest(...args) } }));

let mockList: ListDefinition | undefined;
let mockPaging = { hasNextPage: false, isFetchingNextPage: false };
const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockReload = jest.fn().mockResolvedValue(undefined);
const mockFetchNextPage = jest.fn().mockResolvedValue(undefined);
const mockHookCalls: [string, string | undefined][] = [];
jest.mock('@/features/list/hooks/useListDefinition', () => ({
  useListDefinition: (name: string, search?: string) => (mockHookCalls.push([name, search]), {
    data: mockList,
    isPending: mockList === undefined,
    isError: false,
    refetch: mockRefetch,
    reload: mockReload,
    fetchNextPage: mockFetchNextPage,
    ...mockPaging,
  }),
}));

/** Les recherches demandées à la liste, dans l'ordre, sans répétition. */
function searches() {
  return mockHookCalls.map(([, search]) => search).filter((search, index, all) => index === 0 || search !== all[index - 1]);
}

/** Une liste que l'app ne connaît pas : tout vient de sa définition. */
function item(id: string, overrides: Partial<ListItem> = {}): ListItem {
  return {
    id,
    title: `Carte ${id}`,
    subtitle: 'Expire en 2030',
    image: null,
    rating: null,
    highlight: null,
    edit: { form: 'payments.card', record: id },
    delete: {
      label: 'Retirer',
      confirm: 'Retirer cette carte ?',
      method: 'DELETE',
      endpoint: `/v1/payments/cards/${id}`,
      destructive: true,
      success: { action: 'back', message: 'Carte retirée.' },
    },
    ...overrides,
  };
}

function list(items: ListItem[], overrides: Partial<ListDefinition> = {}): ListDefinition {
  return {
    name: 'payments.cards',
    title: 'Mes cartes',
    empty: 'Aucune carte.',
    create: { label: 'Ajouter une carte', form: 'payments.card' },
    search: null,
    next_cursor: null,
    items,
    ...overrides,
  };
}

async function renderScreen() {
  const auth = { t: TEST_I18N.t };
  await render(
    <AuthContext.Provider value={auth as unknown as AuthContextValue}>
      <ProfileListScreen list="payments.cards" />
    </AuthContext.Provider>,
  );
}

/** Confirme la question de retrait : le bouton destructif de l'alerte est pressé. */
function confirmAlert() {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });

  return alert;
}

describe('ProfileListScreen (toute liste du profil, sans la connaître d’avance)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    takeProfileNotice();
    mockList = list([item('7'), item('8', { subtitle: null })]);
    mockPaging = { hasNextPage: false, isFetchingNextPage: false };
    mockHookCalls.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('affiche le titre dans l’en-tête, les items et le lien de création', async () => {
    await renderScreen();

    expect(screen.getByText('Mes cartes')).toBeTruthy();
    expect(screen.getByText('Carte 7')).toBeTruthy();
    expect(screen.getByText('Expire en 2030')).toBeTruthy();
    expect(screen.getByText('Carte 8')).toBeTruthy();
    expect(screen.getByText('Ajouter une carte')).toBeTruthy();
    expect(screen.queryByTestId('profile-list-empty')).toBeNull();
  });

  it('un item avec photo l’affiche au-dessus de son titre ; sans photo, rien', async () => {
    mockList = list([item('7', { image: 'https://api.test/storage/7.jpg' }), item('8')]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-item-7-photo').props.source).toEqual({ uri: 'https://api.test/storage/7.jpg' });
    expect(screen.queryByTestId('profile-list-item-8-photo')).toBeNull();
  });

  it('vide : affiche le texte servi par l’API', async () => {
    mockList = list([]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-empty').props.children).toBe('Aucune carte.');
  });

  it('le lien de création est fixe, hors de la partie qui défile, avant la liste', async () => {
    await renderScreen();

    // Zone fixe puis liste : le lien n'est pas dans la FlatList (`profile-list`).
    const order = screen.getAllByTestId(/^profile-list(-create)?$/).map((node) => node.props.testID);
    expect(order).toEqual(['profile-list-create', 'profile-list']);
    expect(screen.getByTestId('profile-list-bar')).toBeTruthy();
  });

  it('le bouton de création ouvre le formulaire vide', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-create'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'payments.card' } });
  });

  it('toucher un item ouvre son formulaire lié à l’enregistrement', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-item-7'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'payments.card', record: '7' } });
  });

  it('sans formulaire, toucher un item ouvre l’écran qu’il désigne (une offre en favori)', async () => {
    mockList = list([
      item('7', { edit: null, delete: null, link: '/offers/7' }),
      item('8', { edit: null, delete: null, link: 'https://evil.test' }),
      item('9', { edit: null, delete: null, link: '/profile/delete-account' }),
    ]);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-item-7'));
    expect(router.push).toHaveBeenCalledWith('/offers/7');

    // Un lien qui n'est pas un écran de l'app est ignoré.
    await fireEvent.press(screen.getByTestId('profile-list-item-8'));
    await fireEvent.press(screen.getByTestId('profile-list-item-9'));
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('retirer un item : confirmation, envoi décrit, message, puis liste rechargée depuis le début', async () => {
    const alert = confirmAlert();
    mockRequest.mockResolvedValue(undefined);
    await renderScreen();
    mockReload.mockClear();

    await fireEvent.press(screen.getByTestId('profile-list-delete-7'));

    expect(alert).toHaveBeenCalledWith('Retirer cette carte ?', undefined, expect.any(Array));
    await waitFor(() => expect(mockReload).toHaveBeenCalled());
    expect(mockRequest).toHaveBeenCalledWith('/v1/payments/cards/7', { method: 'DELETE', body: {} });
    expect(screen.getByTestId('profile-list-notice').props.children).toBe('Carte retirée.');
  });

  it('annuler la confirmation : rien n’est envoyé', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
      buttons?.find((button) => button.style === 'cancel')?.onPress?.();
    });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-delete-7'));

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('retrait refusé par l’API : une erreur, et la liste est rechargée', async () => {
    confirmAlert();
    mockRequest.mockRejectedValue(new Error('404'));
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-delete-7'));

    await waitFor(() => expect(screen.getByTestId('profile-list-error')).toBeTruthy());
    expect(screen.queryByTestId('profile-list-notice')).toBeNull();
  });

  it.each([
    ['vers une autre adresse', { endpoint: 'https://example.test/v1/payments/cards/7' }],
    ['méthode inconnue', { method: 'GET' }],
    ['suite inconnue', { success: { action: 'open-url', message: 'x' } }],
  ])('retrait %s : pas de bouton, rien n’est envoyé', async (_name, change) => {
    mockList = list([item('7', { delete: { ...item('7').delete!, ...change } })]);
    await renderScreen();

    expect(screen.queryByTestId('profile-list-delete-7')).toBeNull();
    expect(screen.getByText('Carte 7')).toBeTruthy();
  });

  it('lecture seule : ni création, ni édition, ni retrait', async () => {
    mockList = list([item('7', { edit: null, delete: null })], { create: null });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-item-7'));

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByTestId('profile-list-create')).toBeNull();
    expect(screen.queryByTestId('profile-list-delete-7')).toBeNull();
  });

  it('premier affichage : pas de rechargement en plus du chargement initial', async () => {
    await renderScreen();

    expect(mockReload).not.toHaveBeenCalled();
  });

  it('en approchant du bas, charge la page suivante tant qu’il en reste', async () => {
    mockPaging = { hasNextPage: true, isFetchingNextPage: false };
    await renderScreen();

    await act(async () => {
      fireEvent(screen.getByTestId('profile-list'), 'onEndReached', { distanceFromEnd: 10 });
    });

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('dernière page atteinte : ne demande plus rien', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent(screen.getByTestId('profile-list'), 'onEndReached', { distanceFromEnd: 10 });
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it('suite en cours de chargement : indicateur en pied de liste', async () => {
    mockPaging = { hasNextPage: true, isFetchingNextPage: true };
    await renderScreen();

    expect(screen.getByTestId('profile-list-loading-more')).toBeTruthy();
  });

  it('tirer vers le bas recharge depuis le début', async () => {
    await renderScreen();
    mockReload.mockClear();

    await act(async () => {
      fireEvent(screen.getByTestId('profile-list'), 'onRefresh');
    });

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('au retour d’un formulaire enregistré, affiche son message une seule fois', async () => {
    backWithNotice('Carte enregistrée.');
    await renderScreen();

    expect(router.back).toHaveBeenCalled();
    expect(screen.getByTestId('profile-list-notice').props.children).toBe('Carte enregistrée.');
    expect(takeProfileNotice()).toBeNull();
  });

  it('liste non cherchable : pas de champ de recherche', async () => {
    await renderScreen();

    expect(screen.queryByTestId('profile-list-search')).toBeNull();
  });

  it('liste cherchable : la recherche part une fois, après la pause de frappe', async () => {
    jest.useFakeTimers();
    mockList = list([item('7')], { search: 'Rechercher une carte…' });
    await renderScreen();

    expect(screen.getByTestId('profile-list-search').props.placeholder).toBe('Rechercher une carte…');
    await fireEvent.changeText(screen.getByTestId('profile-list-search'), 'vi');
    await act(async () => jest.advanceTimersByTime(100));
    await fireEvent.changeText(screen.getByTestId('profile-list-search'), 'visa ');
    await act(async () => jest.advanceTimersByTime(299));
    expect(searches()).toEqual(['']);

    await act(async () => jest.advanceTimersByTime(1));
    expect(searches()).toEqual(['', 'visa']);
  });

  it('recherche sans résultat : « Aucun résultat. », et le champ reste affiché', async () => {
    jest.useFakeTimers();
    mockList = list([], { search: 'Rechercher une carte…' });
    await renderScreen();
    expect(screen.getByTestId('profile-list-empty').props.children).toBe('Aucune carte.');

    await fireEvent.changeText(screen.getByTestId('profile-list-search'), 'zzz');
    await act(async () => jest.advanceTimersByTime(300));

    expect(screen.getByTestId('profile-list-empty').props.children).toBe('Aucun résultat.');
    expect(screen.getByTestId('profile-list-search').props.value).toBe('zzz');
    expect(screen.getByTestId('profile-list-create')).toBeTruthy();
  });

  it('effacer la recherche redemande toute la liste', async () => {
    jest.useFakeTimers();
    mockList = list([item('7')], { search: 'Rechercher une carte…' });
    await renderScreen();

    await fireEvent.changeText(screen.getByTestId('profile-list-search'), 'visa');
    await act(async () => jest.advanceTimersByTime(300));
    await fireEvent.changeText(screen.getByTestId('profile-list-search'), '');
    await act(async () => jest.advanceTimersByTime(300));

    expect(searches()).toEqual(['', 'visa', '']);
  });
});
