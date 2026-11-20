import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormFieldDefinition } from '@/features/form/types';
import { resetFilters, setFilterValues } from '@/features/list/utils/filters';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { NotificationsScreen } from '../screens/NotificationsScreen';
import { notificationService } from '../services/NotificationService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');

  return { router: { push: jest.fn() }, useFocusEffect: (effect: () => void) => useEffect(effect, [effect]) };
});
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
jest.mock('../services/NotificationService', () => ({
  notificationService: { list: jest.fn(), unreadCount: jest.fn(), read: jest.fn(), readAll: jest.fn() },
}));

const PAGE = {
  items: [
    { id: 'a', title: 'Demande de logement', tag: { label: 'En attente', tone: 'warning' }, body: 'Marie Curie demande un séjour.', actor: { id: '4', name: 'Marie Curie', initials: 'MC', photo: null, online: true, link: '/members/4' }, summary: 'demande un séjour.', message: 'Je viens pour le travail.', link: '/profile/lists/offer.bookings.received', links: [{ label: 'Voir l’annonce', link: '/offers/12' }], text_links: [{ text: 'Marie Curie', link: '/members/4' }], link_label: 'Réservations reçues', read: false, created_at: new Date().toISOString() },
    { id: 'b', title: 'Demande de logement', tag: null, body: 'Votre demande est acceptée.', message: null, link: 'https://exemple.test', links: [], text_links: [], link_label: null, read: true, created_at: '2026-01-02T10:00:00Z' },
  ],
  next_cursor: null,
};

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <NotificationsScreen />
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

  it('la plus récente en tête, les non lues mises en avant', async () => {
    await show();

    expect(await screen.findByTestId('notification-a-tag')).toBeTruthy();
    expect(screen.getByText('En attente')).toBeTruthy();
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

  it('la carte : qui agit (cerclé de vert en ligne) et la date, le statut, puis le texte sans son nom, le message', async () => {
    await show();

    expect(await screen.findByTestId('notification-a-avatar-online')).toBeTruthy();
    expect(screen.getByTestId('notification-a-actor')).toHaveTextContent('Marie Curie');
    expect(screen.getByTestId('notification-a-text')).toHaveTextContent('demande un séjour.');
    expect(screen.getByTestId('notification-a-text')).not.toHaveTextContent('Marie Curie');
    // Sans qui agit (une ancienne notification) : son titre en tête, son texte entier.
    expect(screen.queryByTestId('notification-b-actor')).toBeNull();
    expect(screen.getByTestId('notification-b-text')).toHaveTextContent('Votre demande est acceptée.');
    // Le message, sur une ligne.
    expect(screen.getByText('Je viens pour le travail.').props.numberOfLines).toBe(1);

    // Ni le nom ni la photo de qui agit ne sont cliquables sur la carte.
    expect(screen.getByTestId('notification-a-actor').props.onPress).toBeUndefined();
  });

  it('une notification lue ouvre sa page sans repartir à l’API', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notification-b'));

    expect(router.push).toHaveBeenCalledWith('/notifications/b');
    expect(notificationService.read).not.toHaveBeenCalled();
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

    // Le lien « Filtres » ouvre l’écran des filtres de la liste « notifications ».
    await fireEvent.press(await screen.findByText('Filtres'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/filters/[list]', params: { list: 'notifications' } });

    // Une recherche, après la pause de frappe, puis un filtre choisi : les deux partent à l’API.
    jest.mocked(notificationService.list).mockResolvedValue({ items: [], next_cursor: null, filters });
    await fireEvent.changeText(screen.getByTestId('notifications-list-search'), 'paul');
    await waitFor(() => expect(notificationService.list).toHaveBeenLastCalledWith(null, 'paul', {}));
    setFilterValues('notifications', { offer: '22' });
    await waitFor(() => expect(notificationService.list).toHaveBeenLastCalledWith(null, 'paul', { offer: '22' }));
    expect(await screen.findByText('Aucune notification ne correspond à cette recherche.')).toBeTruthy();
    expect(screen.getByTestId('notifications-list-filter-badge')).toHaveTextContent('1');
  });
});
