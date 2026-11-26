import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormFieldDefinition } from '@/features/form/types';
import { resetFilters, setFilterValues } from '@/features/list/utils/filters';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { NotificationsScreen } from '../screens/NotificationsScreen';
import { notificationService } from '../services/NotificationService';
import { NOTIFICATION_CARD_MAX } from '../utils/preview';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return {
    router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    useRootNavigationState: () => undefined,
    useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }),
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('../services/NotificationService', () => ({
  notificationService: { list: jest.fn(), unreadCount: jest.fn(), read: jest.fn(), readAll: jest.fn() },
}));

const PAGE = {
  items: [
    { id: 'a', title: 'Nouvelle demande', tag: { label: 'En attente', tone: 'warning' }, body: 'Marie Curie demande un séjour.', actor: { id: '4', name: 'Marie Curie', initials: 'MC', photo: null, online: true, link: '/members/4' }, summary: 'Demande de location « Studio » du 5 au 7 déc.', message: 'Je viens pour le travail.', link: '/profile/lists/offer.bookings.received', links: [{ label: 'Voir l’annonce', link: '/offers/12' }], text_links: [{ text: 'Marie Curie', link: '/members/4' }, { text: 'Studio', link: '/offers/12' }], link_label: 'Réservations reçues', read: false, created_at: new Date().toISOString() },
    { id: 'b', title: 'Demande de logement', tag: null, body: 'Votre demande est acceptée.', message: null, link: 'https://exemple.test', links: [], text_links: [], link_label: null, read: true, created_at: '2026-01-02T10:00:00Z' },
  ],
  next_cursor: null,
  count: '2 notifications',
};

async function show(back = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <NotificationsScreen back={back} />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('NotificationsScreen (décision 2026-11-19-contrat-centre-notifications)', () => {
  beforeEach(() => {
    resetFilters();
    jest.clearAllMocks();
    jest.mocked(notificationService.list).mockResolvedValue(PAGE);
    jest.mocked(notificationService.unreadCount).mockResolvedValue(1);
    jest.mocked(notificationService.read).mockResolvedValue(undefined);
    jest.mocked(notificationService.readAll).mockResolvedValue(undefined);
  });

  it('une carte tronque son texte et son message, quel que soit le type (décision 2026-11-26-cartes-notifications-tronquees)', async () => {
    const long = `Bonjour,\n<b>Je suis très intéressé</b> par votre logement. ${'Pouvez-vous me rappeler ? '.repeat(10)}Merci`;
    jest.mocked(notificationService.list).mockResolvedValue({
      ...PAGE,
      items: [{ id: 'm', title: 'Message', tag: null, body: long, message: `PS : ${long}`, link: null, links: [], text_links: [], link_label: null, read: true, created_at: '2026-01-02T10:00:00Z' }],
    });
    await show();

    const text = (await screen.findByTestId('notification-m-text')).props.children.flat().join('');
    expect(text.length).toBeLessThanOrEqual(NOTIFICATION_CARD_MAX + 1);
    expect(text.startsWith('Bonjour, Je suis très intéressé par votre logement.')).toBe(true);
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toContain('<b>');
    const message = screen.getByTestId('notification-m-message').props.children as string;
    expect(message.length).toBeLessThanOrEqual(NOTIFICATION_CARD_MAX + 1);
    expect(message.endsWith('…')).toBe(true);
  });

  it('un message à l’éditeur : son texte sur la carte, une seule fois (décision 2026-11-26-carte-message-texte)', async () => {
    jest.mocked(notificationService.list).mockResolvedValue({
      ...PAGE,
      items: [{ id: 'm', title: 'Message', tag: null, body: 'Le studio est-il libre ?', summary: 'Le studio est-il libre ?', message: 'Le studio est-il libre ?', actor: { id: '4', name: 'Jean', initials: 'J', photo: null, online: false, link: '/members/4' }, link: null, links: [], text_links: [], link_label: null, read: true, created_at: '2026-01-02T10:00:00Z' }],
    });
    await show();

    expect(await screen.findByTestId('notification-m-text')).toHaveTextContent('Le studio est-il libre ?');
    expect(screen.queryByTestId('notification-m-message')).toBeNull();
  });

  it('la plus récente en tête, les non lues mises en avant', async () => {
    await show();

    expect(await screen.findByTestId('notification-a-type')).toBeTruthy();
    // La pastille du statut de nouveau sur la carte, en haut à droite (décision 2026-11-26-carte-notification-statut) ;
    // aucune sans statut.
    expect(screen.getByTestId('notification-a-tag')).toHaveTextContent('En attente');
    // Le type en gras, sur chaque notification.
    expect(screen.getByTestId('notification-a-type')).toHaveTextContent('Nouvelle demande');
    expect(screen.getByTestId('notification-b-type')).toHaveTextContent('Demande de logement');
    expect(screen.queryByTestId('notification-b-tag')).toBeNull();
    expect(screen.getByText('Je viens pour le travail.')).toBeTruthy();
    expect(screen.queryByTestId('notification-b-message')).toBeNull();
    // Sans pastille : une non lue se lit à son fond, à son titre en gras et à « Non lue ».
    expect(screen.getByTestId('notification-a').props.accessibilityLabel).toMatch(/^Non lue : /);
    expect(screen.getByTestId('notification-b').props.accessibilityLabel).not.toMatch(/^Non lue/);
    // Plus de lien « Tout marquer comme lu ».
    expect(screen.queryByText('Tout marquer comme lu')).toBeNull();
  });

  it('toucher une notification la marque lue et ouvre sa page', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notification-a'));

    expect(notificationService.read).toHaveBeenCalledWith('a');
    expect(router.push).toHaveBeenCalledWith('/notifications/a');
    await waitFor(() => expect(screen.getByTestId('notification-a').props.accessibilityLabel).not.toMatch(/^Non lue/));
  });

  it('« Voir l’annonce » marque la notification lue et ouvre la fiche de l’offre', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Voir l’annonce'));

    expect(notificationService.read).toHaveBeenCalledWith('a');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/offers/12');
  });

  it('la carte : le type, qui envoie sauf nous, le message en italique gris, la date à droite ; sans titre composé ni logement (décision 2026-11-22-carte-notification-type-auteur-message-date)', async () => {
    await show();

    expect(await screen.findByTestId('notification-a-actor')).toHaveTextContent('Marie Curie');
    // Le texte après le type : sans le nom de qui envoie, écrit dessous ; entier sans lui.
    expect(screen.getByTestId('notification-a-text')).toHaveTextContent('Demande de location « Studio » du 5 au 7 déc.');
    expect(screen.getByTestId('notification-b-text')).toHaveTextContent('Votre demande est acceptée.');
    const message = screen.getByTestId('notification-a-message');
    expect(message).toHaveTextContent('Je viens pour le travail.');
    expect(message.props.numberOfLines).toBe(1);
    expect(message.props.style).toEqual(expect.arrayContaining([{ fontStyle: 'italic' }]));
    expect(screen.getByTestId('notification-a-date').props.style).toEqual(expect.arrayContaining([{ textAlign: 'right' }]));
    // Sans qui agit : pas de nom.
    expect(screen.queryByTestId('notification-b-actor')).toBeNull();
  });

  it('type, texte, qui envoie, message, puis la date (décision 2026-11-22-carte-notification-date-apres-message)', async () => {
    await show();

    const card = await screen.findByTestId('notification-a');
    const ids: string[] = [];
    const walk = (node: { props?: { testID?: string }; children?: unknown[] } | string) => {
      if (typeof node === 'string') return;
      if (node.props?.testID?.startsWith('notification-a-') && !ids.includes(node.props.testID)) ids.push(node.props.testID);
      (node.children ?? []).forEach((child) => walk(child as never));
    };
    walk(card as never);
    expect(ids.filter((id) => /-(type|actor|text|message|date)$/.test(id))).toEqual([
      // Le nom de qui envoie avant le texte (décision 2026-11-26-carte-expediteur-avant-texte).
      'notification-a-type',
      'notification-a-actor',
      'notification-a-text',
      'notification-a-message',
      'notification-a-date',
    ]);
  });

  it('le nom de qui envoie ouvre sa page et marque la notification lue (décision 2026-11-22-carte-notification-lien-expediteur)', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notification-a-actor'));

    expect(screen.getByTestId('notification-a-actor').props.accessibilityRole).toBe('link');
    expect(notificationService.read).toHaveBeenCalledWith('a');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/members/4');
  });

  it('le nom du logement, dans le texte, ouvre l’annonce (décision 2026-11-22-lien-nom-logement)', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Studio'));

    expect(notificationService.read).toHaveBeenCalledWith('a');
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/offers/12');
  });

  it('pas de nom quand c’est nous ou sans expéditeur, même avec un message (décision 2026-11-22-carte-notification-date-apres-message)', async () => {
    const us = { ...PAGE.items[0], id: 'c', actor: { ...PAGE.items[0].actor!, id: '1' } };
    const own = { ...PAGE.items[0], id: 'd', actor: null };
    jest.mocked(notificationService.list).mockResolvedValue({ ...PAGE, items: [us, own] });
    await show();

    for (const id of ['c', 'd']) {
      expect(await screen.findByTestId(`notification-${id}-message`)).toBeTruthy();
      expect(screen.queryByTestId(`notification-${id}-actor`)).toBeNull();
    }
  });

  it('une notification lue ouvre sa page sans repartir à l’API', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notification-b'));

    expect(router.push).toHaveBeenCalledWith('/notifications/b');
    expect(notificationService.read).not.toHaveBeenCalled();
  });

  it('le nombre de notifications en gras sous les filtres (décision 2026-11-22-notifications-nombre)', async () => {
    await show();

    expect(await screen.findByTestId('notifications-count')).toHaveTextContent('2 notifications');
  });

  it('sans notification : le texte vide', async () => {
    jest.mocked(notificationService.list).mockResolvedValue({ items: [], next_cursor: null });
    await show();

    expect(await screen.findByTestId('notifications-list-empty')).toHaveTextContent("Aucune notification pour l'instant.");
  });

  it('la recherche et les filtres servis par l’API restreignent la liste', async () => {
    const filters: FormFieldDefinition[] = [{ name: 'offer', type: 'select', label: 'Logement', placeholder: null, help: null, required: false, default: null, options: [{ value: '22', label: 'Studio photos' }] }];
    jest.mocked(notificationService.list).mockResolvedValue({ ...PAGE, filters });
    await show();

    // Le lien « Filtres » ouvre le panneau des filtres de la liste « notifications » (décision 2026-11-25-filtres-en-panneau).
    await fireEvent.press(await screen.findByText('Filtres'));
    expect(screen.getByTestId('filter-sheet')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('filter-sheet-close'));

    // Une recherche, après la pause de frappe, puis un filtre choisi : les deux partent à l’API.
    jest.mocked(notificationService.list).mockResolvedValue({ items: [], next_cursor: null, filters });
    await fireEvent.changeText(screen.getByTestId('notifications-list-search'), 'paul');
    await waitFor(() => expect(notificationService.list).toHaveBeenLastCalledWith(null, 'paul', {}));
    setFilterValues('notifications', { offer: '22' });
    await waitFor(() => expect(notificationService.list).toHaveBeenLastCalledWith(null, 'paul', { offer: '22' }));
    expect(await screen.findByText('Aucune notification ne correspond à cette recherche.')).toBeTruthy();
    expect(screen.getByTestId('notifications-list-filter-badge')).toHaveTextContent('1');
  });

  it('ouvert depuis une carte : un en-tête avec son bouton retour (décision 2026-11-21-notifications-avec-retour)', async () => {
    await show(true);

    await waitFor(() => expect(screen.getAllByText('Demande de logement', { exact: false }).length).toBeGreaterThan(0));
    expect(screen.getByLabelText('Retour')).toBeTruthy();
    // Titrée « Demandes » (décision 2026-11-21-demandes-depuis-logements).
    expect(screen.getByTestId('back-header-title')).toHaveTextContent('Demandes');
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(router.back).toHaveBeenCalled();
  });
});
