import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Alert, type AlertButton } from 'react-native';

import type { ListDefinition, ListItem } from '@/features/list/types';
import * as filterStore from '@/features/list/utils/filters';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { AuthContext } from '../context/AuthContext';
import { ProfileListScreen } from '../screens/ProfileListScreen';
import type { AuthContextValue } from '../types';
import { TONE_COLORS } from '@/shared/components/StatusTag';
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
    <I18nContext.Provider value={TEST_I18N}>
      <AuthContext.Provider value={auth as unknown as AuthContextValue}>
        <ProfileListScreen list="payments.cards" />
      </AuthContext.Provider>
    </I18nContext.Provider>,
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

  it('les compteurs sans ton : pour information, sans lien, à droite, sur un vert doux (décision 2026-11-22-compteurs-non-lus-info)', async () => {
    const pending = { label: '2 demandes en attente', list: 'notifications', filter: { type: 'booking', status: 'pending', offer: '7' }, link: '/notifications' };
    const unread = { label: '1 notification non lue', list: 'notifications', filter: { ...pending.filter, unread: 'yes' }, link: '/notifications' };
    mockList = list([item('7', { counter: pending, counters: [pending, unread] })]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-counter-7')).toHaveTextContent('2 demandes en attente');
    expect(screen.getByTestId('profile-list-counter-7-1')).toHaveTextContent('1 notification non lue');
    expect(screen.queryByRole('link', { name: '1 notification non lue' })).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-counter-7').props.style).backgroundColor).toBe('#E3F4EA');
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-counters-7').props.style).justifyContent).toBe('flex-end');
    await fireEvent.press(screen.getByTestId('profile-list-counter-7-1'));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sans photo : la pastille des demandes en attente sous le titre, pour information (décision 2026-11-21-pastille-sans-lien)', async () => {
    const pending = { label: '2 demandes en attente', list: 'notifications', filter: { type: 'booking', status: 'pending', offer: '7' }, link: '/notifications', tone: 'warning' };
    const unread = { label: '1 notification non lue', list: 'notifications', filter: { ...pending.filter, unread: 'yes' }, link: '/notifications' };
    mockList = list([item('7', { counter: pending, counters: [pending, unread] })]);
    await renderScreen();

    // Une pastille orange, pas un lien.
    const badge = screen.getByTestId('profile-list-badge-7');
    expect(badge).toHaveTextContent('2 demandes en attente');
    expect(StyleSheet.flatten(badge.props.style).backgroundColor).toBe(TONE_COLORS.warning);
    expect(screen.queryByRole('link', { name: '2 demandes en attente' })).toBeNull();
    // Le compteur sans ton, en bas, pour information.
    expect(screen.getByTestId('profile-list-counter-7')).toHaveTextContent('1 notification non lue');
  });

  it('avec une photo : la pastille des demandes en attente à la place du statut, sans lien (décisions 2026-11-21-pastille-sur-la-photo et 2026-11-21-pastille-sans-lien)', async () => {
    const pending = { label: '2 demandes en attente', list: 'notifications', filter: { type: 'booking', status: 'pending', offer: '7' }, link: '/notifications', tone: 'warning' };
    const tag = { label: 'Publiée', tone: 'success', on_image: true };
    mockList = list([
      item('7', { image: 'https://api.test/storage/7.jpg', tag, counter: pending, counters: [pending] }),
      item('8', { image: 'https://api.test/storage/8.jpg', tag }),
    ]);
    await renderScreen();

    // Sur la photo, à la place de « Publiée » ; ni sous le titre, ni lien.
    expect(screen.getByTestId('profile-list-item-7-status')).toHaveTextContent('2 demandes en attente');
    expect(screen.queryByTestId('profile-list-badge-7')).toBeNull();
    expect(screen.queryByTestId('profile-list-counter-7')).toBeNull();
    expect(screen.queryByRole('link', { name: '2 demandes en attente' })).toBeNull();
    // Sans demande en attente : le statut.
    expect(screen.getByTestId('profile-list-item-8-status')).toHaveTextContent('Publiée');
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
      'profile-list-menu-7-edit',
      'profile-list-menu-7-action-0',
      'profile-list-menu-7-delete',
    ]);
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-action-0'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/7/calendar');
    // Choisir une entrée referme le menu.
    expect(screen.queryByTestId('profile-list-menu-7-list')).toBeNull();
    // Plus de « Voir » : toucher la carte ouvre la fiche, pas le formulaire (décision 2026-11-22-logements-carte-vers-fiche).
    await fireEvent.press(screen.getByTestId('profile-list-item-7'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/7');
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

  it('l’intitulé servi s’affiche sous les filtres, en tête des items, avec son sous-titre (décisions 2026-11-21-demandes-titre-sous-filtres et 2026-11-21-demandes-d-une-offre)', async () => {
    mockList = { ...list([item('7')]), heading: { title: 'Studio meublé à Akwa', subtitle: 'Location meublée · Studio · Douala' } };
    await renderScreen();

    expect(screen.getByTestId('profile-list-heading-title')).toHaveTextContent('Studio meublé à Akwa');
    expect(screen.getByTestId('profile-list-heading-subtitle')).toHaveTextContent('Location meublée · Studio · Douala');
  });

  it('un intitulé sans titre : son sous-titre seul (décision 2026-11-21-demandes-titre-logement-barre)', async () => {
    mockList = { ...list([item('7')]), heading: { title: null, subtitle: 'Location · Appartement · Douala' } };
    await renderScreen();

    expect(screen.queryByTestId('profile-list-heading-title')).toBeNull();
    expect(screen.getByTestId('profile-list-heading-subtitle')).toHaveTextContent('Location · Appartement · Douala');
  });

  it('sans intitulé, rien sous les filtres', async () => {
    mockList = list([item('7')]);
    await renderScreen();

    expect(screen.queryByTestId('profile-list-heading')).toBeNull();
  });

  it('sans photo, avec le menu : le texte s’arrête avant le bouton rond (décision 2026-11-21-demandes-sans-photo)', async () => {
    mockList = { ...list([item('7', { link: '/offers/7', tag: { label: 'En attente', tone: 'warning' }, actions: [{ label: 'Accepter', style: 'primary', confirm: null, submission: null, form: null, link: null }] })]), menu: true };
    await renderScreen();

    expect(screen.getByTestId('profile-list-menu-7-toggle')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-item-7').props.style).paddingRight).toBeGreaterThan(32);
  });

  it('un titre avec son lien ouvre son écran ; le reste de la carte garde le sien (décision 2026-11-21-demandes-lien-membre)', async () => {
    mockList = list([item('7', { edit: null, title: 'Awa Ndiaye', title_link: '/members/3', link: '/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d' })]);
    await renderScreen();

    // Le lien sur le texte seul, pas sur toute la ligne (décision 2026-11-22-liens-sur-le-texte).
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-title-link-7').props.style)).toMatchObject({ alignSelf: 'flex-start' });
    await fireEvent.press(screen.getByTestId('profile-list-title-link-7'));
    expect(router.push).toHaveBeenLastCalledWith('/members/3');
    await fireEvent.press(screen.getByTestId('profile-list-item-7'));
    expect(router.push).toHaveBeenLastCalledWith('/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d');
  });

  it('un sous-titre avec son lien ouvre son écran ; le reste de la carte garde le sien (décision 2026-11-22-reservations-lien-offre)', async () => {
    mockList = list([item('7', { edit: null, subtitle: 'Studio meublé à Akwa', subtitle_link: '/offers/12', link: '/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d' })]);
    await renderScreen();

    const subtitle = screen.getByTestId('profile-list-subtitle-link-7');
    expect(subtitle).toHaveTextContent('Studio meublé à Akwa');
    await fireEvent.press(subtitle);
    expect(router.push).toHaveBeenLastCalledWith('/offers/12');
    await fireEvent.press(screen.getByTestId('profile-list-item-7'));
    expect(router.push).toHaveBeenLastCalledWith('/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d');
  });

  it('sans photo : le statut et la pastille d’un compteur sur une ligne, au-dessus du titre (décision 2026-11-21-demandes-pastille-non-lues-total)', async () => {
    const unread = { label: '2 notifications non lues', list: 'notifications', filter: {}, link: '/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', tone: 'danger' };
    mockList = list([item('7', { tag: { label: 'En attente', tone: 'warning' }, counter: unread, counters: [unread] })]);
    await renderScreen();

    const row = screen.getByTestId('profile-list-tags-7');
    expect(within(row).getByTestId('profile-list-tag-7')).toHaveTextContent('En attente');
    expect(within(row).getByTestId('profile-list-badge-7')).toHaveTextContent('2 notifications non lues');
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-badge-7').props.style).backgroundColor).toBe(TONE_COLORS.danger);
    expect(screen.queryByTestId('profile-list-counter-7')).toBeNull();
  });

  it('un menu ouvert se ferme en touchant ailleurs, sans rien ouvrir, ou en faisant défiler (décision 2026-11-21-menu-fermer-ailleurs)', async () => {
    mockList = {
      ...list([
        item('7', { edit: null, link: '/offers/7', actions: [{ label: 'Calendrier', style: 'default', confirm: null, submission: null, form: null, link: '/offers/7/calendar' }] }),
        item('8', { edit: null, link: '/offers/8', actions: [{ label: 'Calendrier', style: 'default', confirm: null, submission: null, form: null, link: '/offers/8/calendar' }] }),
      ]),
      menu: true,
    };
    await renderScreen();

    // Retoucher ⋮ le ferme.
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-toggle'));
    expect(screen.getByTestId('profile-list-menu-7-list')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-toggle'));
    expect(screen.queryByTestId('profile-list-menu-7-list')).toBeNull();
    // Toucher une carte le ferme, sans l'ouvrir.
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-toggle'));
    await fireEvent.press(screen.getByTestId('profile-list-item-8'));
    expect(screen.queryByTestId('profile-list-menu-7-list')).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    // Menu fermé : la carte s'ouvre.
    await fireEvent.press(screen.getByTestId('profile-list-item-8'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/8');
    // Faire défiler le ferme.
    await fireEvent.press(screen.getByTestId('profile-list-menu-8-toggle'));
    await fireEvent(screen.getByTestId('profile-list'), 'scrollBeginDrag');
    expect(screen.queryByTestId('profile-list-menu-8-list')).toBeNull();
  });

  it('la note sous le prix, sur sa ligne, à droite (décision 2026-11-21-accueil-note-sous-le-prix)', async () => {
    mockList = list([item('7', { highlight: '45 000 FCFA / jour', rating: { average: 4, count: 1 } })]);
    await renderScreen();

    expect(screen.getByTestId('profile-list-item-7-highlight')).toHaveTextContent('45 000 FCFA / jour');
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-item-7-rating').props.style).alignSelf).toBe('flex-end');
  });

  it('les espacements de la carte de l’accueil : 8 de marge, 4 entre les lignes (décision 2026-11-22-cartes-espacements-accueil)', async () => {
    mockList = list([item('7', { image: 'https://api.test/storage/7.jpg', link: '/offers/7' })]);
    await renderScreen();

    expect(StyleSheet.flatten(screen.getByTestId('profile-list-row-7').props.style)).toMatchObject({ padding: 8, gap: 4 });
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-item-7').props.style)).toMatchObject({ gap: 4 });
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-body-7').props.style)).toMatchObject({ paddingHorizontal: 8, paddingVertical: 4 });
    // Le titre en gras, à la taille de l'accueil (décision 2026-11-22-cartes-titre-gras).
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-title-7').props.style).fontWeight).toBe(700);
  });

  it('le type de demande et les dates sur leur ligne, sous le sous-titre (décision 2026-11-22-reservations-ligne-dates)', async () => {
    mockList = list([item('7', { subtitle: 'Studio meublé à Akwa', detail: 'Séjour · du 2 déc. 2026 au 6 déc. 2026' })]);
    await renderScreen();

    expect(screen.getByText('Studio meublé à Akwa')).toBeTruthy();
    expect(screen.getByTestId('profile-list-detail-7')).toHaveTextContent('Séjour · du 2 déc. 2026 au 6 déc. 2026');
    // En gris, comme le sous-titre.
    expect(StyleSheet.flatten(screen.getByTestId('profile-list-detail-7').props.style).color).toBe(StyleSheet.flatten(screen.getByText('Studio meublé à Akwa').props.style).color);
  });

  it('la date de la dernière notification après le message, à droite, avec le mois en lettres (décisions 2026-11-22-demandes-date-apres-message et 2026-11-22-dates-sans-chiffres)', async () => {
    mockList = list([
      item('7', { title: 'Awa Ndiaye', quote: 'Arrivée vers 18 h.', date: new Date(Date.now() - 5 * 60 * 1000).toISOString() }),
      item('8', { title: 'Paul Mbia', date: '2026-01-03T10:00:00Z' }),
    ]);
    await renderScreen();

    // Après le message, alignée à droite.
    const date = screen.getByTestId('profile-list-date-7');
    expect(StyleSheet.flatten(date.props.style)).toMatchObject({ textAlign: 'right' });
    const order = screen.getAllByText(/^(Awa Ndiaye|Arrivée vers 18 h\.|il y a 5 min)$/).map((node) => String(node.props.children));
    expect(order).toEqual(['Awa Ndiaye', 'Arrivée vers 18 h.', 'il y a 5 min']);
    // Avant hier : la date, mois en lettres, et l'heure (décision 2026-11-22-dates-sans-chiffres).
    expect(screen.getByTestId('profile-list-date-8')).toHaveTextContent(/^3 janv\. 2026 \d{2}:\d{2}$/);
  });

  it('le message après le texte (décision 2026-11-22-demandes-message-apres-texte)', async () => {
    mockList = list([item('7', { title: 'Awa Ndiaye', subtitle: 'Séjour · du 2 au 6 déc.', quote: 'Arrivée vers 18 h.' })]);
    await renderScreen();

    // Les textes dans l'ordre de l'écran.
    const order = screen.getAllByText(/^(Awa Ndiaye|Arrivée vers 18 h\.|Séjour · du 2 au 6 déc\.)$/).map((node) => String(node.props.children));
    expect(order).toEqual(['Awa Ndiaye', 'Séjour · du 2 au 6 déc.', 'Arrivée vers 18 h.']);
  });

  it('le nombre de notifications non lues en pastille à droite du message (décision 2026-11-22-demandes-pastille-nombre-message)', async () => {
    mockList = list([item('7', { title: 'Awa Ndiaye', quote: 'Arrivée vers 18 h.', unread_count: 2 }), item('8', { title: 'Paul Mbia', quote: 'Bonjour' })]);
    await renderScreen();

    const pill = screen.getByTestId('profile-list-unread-7');
    expect(pill).toHaveTextContent('2');
    expect(pill.props.accessibilityLabel).toBe('Notifications non lues : 2');
    // Vert franc, chiffre en blanc (décision 2026-11-22-demandes-pastille-vert-franc).
    expect(StyleSheet.flatten(within(pill).getByText('2').props.style).color).toBe('#ffffff');
    // Sur la ligne du message, à sa droite.
    expect(StyleSheet.flatten(pill.parent?.props.style)).toMatchObject({ flexDirection: 'row' });
    expect(screen.queryByTestId('profile-list-unread-8')).toBeNull();
  });

  it('« Demandes » du menu ouvre la liste des demandes reçues, le logement choisi (décision 2026-11-21-demandes-comme-mes-reservations)', async () => {
    mockList = {
      ...list([item('7', { link: '/offers/7', actions: [{ label: 'Demandes', style: 'default', confirm: null, submission: null, form: null, link: null, list: 'offer.bookings.received', filter: { offer: '7' } }] })]),
      menu: true,
    };
    await renderScreen();

    await fireEvent.press(screen.getByTestId('profile-list-menu-7-toggle'));
    await fireEvent.press(screen.getByTestId('profile-list-menu-7-action-0'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/lists/[list]', params: { list: 'offer.bookings.received' } });
    expect((await renderHook(() => filterStore.useListFilters('offer.bookings.received'))).result.current.values).toEqual({ offer: '7' });
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

    it('le compteur n’ouvre rien ; le bouton du bas ouvre son formulaire', async () => {
      mockList = list([item('12', { counter: { label: '2 demandes en attente', list: 'offer.bookings.received', filter: { offer: '12', status: 'pending' } } })], {
        create: null,
        footer: { label: 'Ajouter un logement', form: 'offer.offer', link: null },
      });
      await renderScreen();

      // Le compteur, pour information, n'ouvre rien (décision 2026-11-22-compteurs-non-lus-info).
      await fireEvent.press(screen.getByText('2 demandes en attente'));
      expect(router.push).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByTestId('profile-list-footer-button'));
      expect(router.push).toHaveBeenLastCalledWith({ pathname: '/profile/[form]', params: { form: 'offer.offer' } });
    });

    it('le bouton du bas peut ouvrir l’onglet Recherche (décision 2026-11-23-onglet-recherche) ; les filtres servis ouvrent l’écran des filtres', async () => {
      mockList = list([item('1')], {
        create: null,
        footer: { label: 'Rechercher un logement', form: null, link: '/search' },
        filters: [{ name: 'status', type: 'segmented', label: 'Statut', placeholder: null, help: null, required: false, default: 'any', options: [] }],
      });
      await renderScreen();

      await fireEvent.press(screen.getByTestId('profile-list-footer-button'));
      expect(router.navigate).toHaveBeenCalledWith('/search');
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

    it('le message du membre sur la carte, en italique', async () => {
      mockList = list([item('3', { quote: 'Je viens pour le travail.', subtitle: 'Sous-titre gris' }), item('4')]);
      await renderScreen();

      expect(screen.getByTestId('profile-list-quote-3')).toHaveTextContent('Je viens pour le travail.');
      // Sans date, rien sous le message.
      expect(screen.queryByTestId('profile-list-date-3')).toBeNull();
      // Une ligne, puis « … », en italique, sans citation (décisions 2026-11-22-demandes-dernier-message et
      // 2026-11-22-demandes-message-italique).
      const message = screen.getByTestId('profile-list-quote-3');
      expect(message.props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(message.props.style).fontStyle).toBe('italic');
      // En gris, comme le sous-titre (décision 2026-11-22-demandes-message-gris).
      expect(StyleSheet.flatten(message.props.style).color).toBe(StyleSheet.flatten(screen.getByText('Sous-titre gris').props.style).color);
      expect(screen.queryByTestId('profile-list-quote-4')).toBeNull();
    });
  });
});
