import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Alert, type AlertButton } from 'react-native';

import type { ListDefinition, ListItem } from '@/features/list/types';
import * as filterStore from '@/features/list/utils/filters';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileListScreen } from '../screens/ProfileListScreen';
import type { AuthContextValue } from '../types';
import { currentToast, hideToast } from '@/shared/components/Toast';

import { backWithNotice } from '../utils/profile-notice';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

// L'écran est considéré comme affiché : l'effet de focus s'exécute au montage.
// Le cœur lui-même est testé à part ; ici, sa place sur la photo.
jest.mock('@/features/list/components/FavoriteHeart', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { FavoriteHeart: ({ testID }: { testID?: string }) => <View testID={testID} /> };
});
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { back: jest.fn(), push: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    useRootNavigationState: () => undefined,
    useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }),
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
    hideToast();
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

  it('« Retirer » à la fin de la carte, à droite, avec ou sans photo', async () => {
    // Décisions 2026-11-19-nuit-retirer-sous-image et 2026-11-21-retirer-en-fin-de-carte.
    mockList = list([item('7', { image: 'https://api.test/storage/7.jpg' }), item('8'), item('9', { delete: null, edit: null })]);
    await renderScreen();

    for (const id of ['7']) {
      expect(StyleSheet.flatten(screen.getByTestId(`profile-list-row-${id}`).props.style).flexDirection).toBe('column');
      expect(StyleSheet.flatten(screen.getByTestId(`profile-list-actions-${id}`).props.style)).toMatchObject({ justifyContent: 'flex-end' });
      expect(screen.getByTestId(`profile-list-delete-${id}`)).toBeTruthy();
    }
    // Sans « Retirer », ni photo, ni formulaire : sur une ligne, sans ligne d'actions.
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-row-9').props.style).flexDirection).toBe('row');
    expect(screen.queryByTestId('profile-list-actions-9')).toBeNull();
  });

  it('plusieurs compteurs côte à côte, chacun vers ses filtres (décision 2026-11-21-compteur-non-lues)', async () => {
    const pending = { label: '2 demandes en attente', list: 'notifications', filter: { type: 'booking', status: 'pending', offer: '7' }, link: '/notifications' };
    const unread = { label: '1 notification non lue', list: 'notifications', filter: { ...pending.filter, unread: 'yes' }, link: '/notifications' };
    mockList = list([item('7', { counter: pending, counters: [pending, unread] })]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-counter-7')).toHaveTextContent('2 demandes en attente');
    expect(screen.getByTestId('profile-list-counter-7-1')).toHaveTextContent('1 notification non lue');
    await fireEvent.press(screen.getByTestId('profile-list-counter-7-1'));
    expect(router.navigate).toHaveBeenLastCalledWith('/notifications');
  });

  it('« Mes logements » : toutes les actions dans un menu « Actions » (décision 2026-11-21-actions-en-menu)', async () => {
    mockList = {
      ...list([item('7', { image: 'https://api.test/storage/7.jpg', link: '/offers/7', tag: { label: 'Publiée', tone: 'success', on_image: true }, actions: [{ label: 'Calendrier', style: 'default', confirm: null, submission: null, form: null, link: '/offers/7/calendar' }] })]),
      menu: true,
    };
    await renderScreen();

    // Fermé : ni Voir, ni Éditer, ni boutons, ni Retirer sur la carte.
    expect(screen.queryByTestId('profile-list-view-7')).toBeNull();
    expect(screen.queryByTestId('profile-list-edit-7')).toBeNull();
    expect(screen.queryByTestId('profile-list-delete-7')).toBeNull();
    expect(screen.queryByText('Calendrier')).toBeNull();
    // Trois petits points, sans texte ; « Actions » pour l'accessibilité (décision 2026-11-21-menu-trois-points).
    expect(screen.getByTestId('profile-list-menu-7-toggle')).not.toHaveTextContent('Actions');
    expect(screen.getByTestId('profile-list-menu-7-toggle').props.accessibilityLabel).toBe('Actions Carte 7');
    // Flottant, en haut à droite de la photo ; le statut passe en haut à gauche (décision 2026-11-21-menu-en-haut-a-droite).
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-menu-7').props.style)).toMatchObject({ position: 'absolute', right: expect.any(Number), top: expect.any(Number) });
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-item-7-status').props.style)).toMatchObject({ position: 'absolute', left: expect.any(Number) });

    // Ouvert : Voir, Éditer, Calendrier, Retirer, dans cet ordre.
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-toggle'));
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-menu-7-list').props.style)).toMatchObject({ position: 'absolute' });
    expect(within(screen.getByTestId('profile-list-menu-7-list')).getAllByRole('button').map((node) => node.props.testID)).toEqual([
      'profile-list-menu-7-view',
      'profile-list-menu-7-edit',
      'profile-list-menu-7-action-0',
      'profile-list-menu-7-delete',
    ]);
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-action-0'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/7/calendar');
    // Choisir une entrée referme le menu.
    expect(screen.queryByTestId('profile-list-menu-7-list')).toBeNull();
  });

  it('« Mes réservations » : le statut en haut à gauche de la photo, le cœur à droite (décision 2026-11-21-reservations-statut-coeur)', async () => {
    mockList = list([item('7', { image: 'https://api.test/storage/7.jpg', tag: { label: 'En attente', tone: 'warning', on_image: true }, favorite: { active: true, endpoint: '/v1/offers/3/favorite' } })]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-item-7-favorite')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-item-7-status').props.style)).toMatchObject({ position: 'absolute', left: expect.any(Number) });
    expect(screen.queryByTestId('profile-list-tag-7')).toBeNull();
  });

  it('« Notifications » du menu ouvre les notifications avec ses filtres déjà choisis (décision 2026-11-21-lien-notifications)', async () => {
    mockList = {
      ...list([item('7', { link: '/offers/7', actions: [{ label: 'Notifications', style: 'default', confirm: null, submission: null, form: null, link: '/notifications', list: 'notifications', filter: { type: 'booking', offer: '7' } }] })]),
      menu: true,
    };
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-menu-7-toggle'));
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-action-0'));
    expect(router.navigate).toHaveBeenLastCalledWith('/notifications');
    expect((await renderHook(() => filterStore.useListFilters('notifications'))).result.current.values).toEqual({ type: 'booking', offer: '7' });
  });

  it('une réservation ouvre la page de sa notification (décision 2026-11-21-reservation-comme-notification)', async () => {
    mockList = list([item('7', { edit: null, link: '/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d' }), item('8', { edit: null, link: '/notifications/../../etc' })]);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-item-7'));
    expect(router.push).toHaveBeenLastCalledWith('/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d');
    // Un lien qui n'est pas un identifiant n'ouvre rien.
    jest.mocked(router.push).mockClear();
    await fireEvent.press(screen.getByTestId('profile-list-item-8'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('le statut sur la photo, à la place du cœur, quand l’API le demande (décision 2026-11-21-statut-a-la-place-du-coeur)', async () => {
    mockList = list([
      item('7', { image: 'https://api.test/storage/7.jpg', tag: { label: 'Publiée', tone: 'success', on_image: true } }),
      item('8', { tag: { label: 'Brouillon', tone: 'neutral', on_image: true } }),
      item('9', { image: 'https://api.test/storage/9.jpg', tag: { label: 'En attente', tone: 'warning' } }),
    ]);
    await renderScreen();

    // Avec photo : sur la photo, en haut à droite.
    expect(screen.getByTestId('profile-list-item-7-status')).toHaveTextContent('Publiée');
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-item-7-status').props.style)).toMatchObject({ position: 'absolute' });
    expect(screen.queryByTestId('profile-list-tag-7')).toBeNull();
    // Sans photo, ou sans la demande de l'API : sous la photo, comme avant.
    expect(screen.getByTestId('profile-list-tag-8')).toHaveTextContent('Brouillon');
    expect(screen.getByTestId('profile-list-tag-9')).toHaveTextContent('En attente');
    expect(screen.queryByTestId('profile-list-item-9-status')).toBeNull();
  });

  it('sans photo : la corbeille à droite du texte, sans « Éditer » ; toucher la carte ouvre le formulaire (décisions 2026-11-21-corbeille-a-droite et 2026-11-21-sans-editer-adresses)', async () => {
    mockList = list([item('8')]);
    await renderScreen();

    // La corbeille sur la ligne du texte, sans le mot « Retirer » ; ni « Éditer », ni ligne d'actions.
    expect(within(screen.getByTestId('profile-list-row-8')).queryByText('Retirer')).toBeNull();
    expect(screen.getByTestId('profile-list-delete-8').props.accessibilityLabel).toBe('Retirer Carte 8');
    expect(screen.queryByTestId('profile-list-edit-8')).toBeNull();
    expect(screen.queryByTestId('profile-list-actions-8')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-row-8').props.style).flexDirection).toBe('row');
    await fireEvent.press(screen.getByTestId('profile-list-item-8'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'payments.card', record: '8' } });
  });

  it('un écran et un formulaire : « Voir », « Éditer » et « Retirer » sur la ligne des actions', async () => {
    // Décision 2026-11-19-nuit-voir-editer-retirer.
    mockList = list([item('7', { image: 'https://api.test/storage/7.jpg', link: '/offers/7' })]);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-view-7'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/7');
    await fireEvent.press(screen.getByTestId('profile-list-edit-7'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'payments.card', record: '7' } });
    expect(screen.getByTestId('profile-list-delete-7')).toBeTruthy();
    // Toucher la carte ouvre toujours le formulaire.
    await fireEvent.press(screen.getByTestId('profile-list-item-7'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'payments.card', record: '7' } });
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
    // Le message dans le bandeau flottant (décision 2026-11-21-bandeau-messages).
    expect(currentToast()).toMatchObject({ message: 'Carte retirée.', tone: 'success' });
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

    await waitFor(() => expect(currentToast()?.tone).toBe('danger'));
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

  it('au retour d’un formulaire enregistré, son message est dans le bandeau, pas dans la liste', async () => {
    backWithNotice('Carte enregistrée.');
    await renderScreen();

    expect(router.back).toHaveBeenCalled();
    expect(currentToast()).toMatchObject({ message: 'Carte enregistrée.', tone: 'success' });
    expect(screen.queryByText('Carte enregistrée.')).toBeNull();
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

  describe('barre du bas, boutons de carte, compteur, filtres (décision 2026-11-19-contrat-reservations-logements-profil)', () => {
    it('« Accepter » demande confirmation puis envoie ; « Refuser » ouvre son formulaire lié à la demande', async () => {
      mockList = list([
        item('5', {
          edit: null,
          delete: null,
          actions: [
            {
              label: 'Accepter',
              style: 'primary',
              confirm: 'Accepter la demande de Marie ?',
              submission: { method: 'POST', endpoint: '/v1/bookings/5/accept', destructive: false, success: { action: 'back', message: 'Demande acceptée.' } },
              form: null,
            },
            { label: 'Refuser', style: 'destructive', confirm: null, submission: null, form: { form: 'offer.booking.refuse', record: '5' } },
          ],
        }),
      ]);
      mockRequest.mockResolvedValue({ data: null });
      const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
        buttons?.find((button) => button.text === 'Accepter')?.onPress?.();
      });
      await renderScreen();

      await fireEvent.press(screen.getByTestId('profile-list-action-5-primary'));
      expect(alert).toHaveBeenCalledWith('Accepter la demande de Marie ?', undefined, expect.any(Array));
      await waitFor(() => expect(mockRequest).toHaveBeenCalledWith('/v1/bookings/5/accept', expect.objectContaining({ method: 'POST' })));
      await waitFor(() => expect(currentToast()).toMatchObject({ message: 'Demande acceptée.', tone: 'success' }));
      expect(mockReload).toHaveBeenCalled();

      await fireEvent.press(screen.getByTestId('profile-list-action-5-destructive'));
      expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'offer.booking.refuse', record: '5' } });
    });

    it('le compteur ouvre sa liste avec ses filtres ; le bouton du bas ouvre son formulaire', async () => {
      mockList = list([item('12', { counter: { label: '2 demandes en attente', list: 'offer.bookings.received', filter: { offer: '12', status: 'pending' } } })], {
        create: null,
        footer: { label: 'Ajouter un logement', form: 'offer.offer', link: null },
      });
      await renderScreen();

      const setValues = jest.spyOn(filterStore, 'setFilterValues');
      await fireEvent.press(screen.getByText('2 demandes en attente'));
      expect(setValues).toHaveBeenCalledWith('offer.bookings.received', { offer: '12', status: 'pending' });
      expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/lists/[list]', params: { list: 'offer.bookings.received' } });

      await fireEvent.press(screen.getByTestId('profile-list-footer-button'));
      expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'offer.offer' } });
    });

    it('un compteur vers un écran (les notifications) l’ouvre avec ses filtres', async () => {
      mockList = list([
        item('22', { counter: { label: '2 demandes en attente', list: 'notifications', filter: { type: 'Received', offer: '22' }, link: '/notifications' } }),
      ]);
      await renderScreen();

      const setValues = jest.spyOn(filterStore, 'setFilterValues');
      await fireEvent.press(screen.getByText('2 demandes en attente'));
      expect(setValues).toHaveBeenCalledWith('notifications', { type: 'Received', offer: '22' });
      expect(router.navigate).toHaveBeenCalledWith('/notifications');
      expect(router.push).not.toHaveBeenCalledWith({ pathname: '/profile/lists/[list]', params: { list: 'notifications' } });
    });

    it('le bouton du bas peut ramener à l’accueil ; les filtres servis ouvrent l’écran des filtres', async () => {
      mockList = list([item('1')], {
        create: null,
        footer: { label: 'Rechercher un logement', form: null, link: '/' },
        filters: [{ name: 'status', type: 'segmented', label: 'Statut', placeholder: null, help: null, required: false, default: 'any', options: [] }],
      });
      await renderScreen();

      await fireEvent.press(screen.getByTestId('profile-list-footer-button'));
      expect(router.navigate).toHaveBeenCalledWith('/');
      await fireEvent.press(screen.getByText('Filtres'));
      expect(router.push).toHaveBeenCalledWith({ pathname: '/filters/[list]', params: { list: 'payments.cards' } });
    });

    it('le statut en pastille de couleur', async () => {
      mockList = list([item('3', { tag: { label: 'En attente', tone: 'warning' } }), item('4')]);
      await renderScreen();

      expect(screen.getByTestId('profile-list-tag-3')).toHaveTextContent('En attente');
      expect(StyleSheet.flatten(screen.getByTestId('profile-list-tag-3').props.style)).toMatchObject({ backgroundColor: '#E8890C' });
      expect(screen.queryByTestId('profile-list-tag-4')).toBeNull();
    });

    it('le message du membre, cité sur la carte', async () => {
      mockList = list([item('3', { quote: 'Je viens pour le travail.' }), item('4')]);
      await renderScreen();

      expect(screen.getByTestId('profile-list-quote-3')).toHaveTextContent('Je viens pour le travail.');
      expect(screen.queryByTestId('profile-list-quote-4')).toBeNull();
    });
  });
});
