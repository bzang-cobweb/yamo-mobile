import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, StyleSheet, type AlertButton } from 'react-native';

import type { ListDefinition, ListItem } from '@/features/list/types';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { AuthContext } from '../context/AuthContext';
import { ProfileListScreen } from '../screens/ProfileListScreen';
import type { AuthContextValue } from '../types';
import { backWithNotice, takeProfileNotice } from '../utils/profile-notice';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
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
jest.mock('@/features/list/hooks/useListDefinition', () => ({
  useListDefinition: () => ({
    data: mockList,
    isPending: mockList === undefined,
    isError: false,
    refetch: mockRefetch,
    reload: mockReload,
    fetchNextPage: mockFetchNextPage,
    ...mockPaging,
  }),
}));

/** Une liste que l'app ne connaît pas : tout vient de sa définition. */
function item(id: string, overrides: Partial<ListItem> = {}): ListItem {
  return {
    id,
    title: `Carte ${id}`,
    subtitle: 'Expire en 2030',
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
  });

  it('affiche le titre dans l’en-tête, les items et le bouton de création', async () => {
    await renderScreen();

    expect(screen.getByText('Mes cartes')).toBeTruthy();
    expect(screen.getByText('Carte 7')).toBeTruthy();
    expect(screen.getByText('Expire en 2030')).toBeTruthy();
    expect(screen.getByText('Carte 8')).toBeTruthy();
    expect(screen.getByText('Ajouter une carte')).toBeTruthy();
    expect(screen.queryByTestId('profile-list-empty')).toBeNull();
  });

  it('vide : affiche le texte servi par l’API', async () => {
    mockList = list([]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-empty').props.children).toBe('Aucune carte.');
  });

  it('le bouton de création est au-dessus de la liste, aligné à droite', async () => {
    await renderScreen();

    // Ordre du rendu : le bouton vient avant le premier item.
    const order = screen.getAllByTestId(/^profile-list-(create|item-7)$/).map((node) => node.props.testID);
    expect(order).toEqual(['profile-list-create', 'profile-list-item-7']);
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-create').props.style)).toEqual(expect.objectContaining({ alignSelf: 'flex-end' }));
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
});
