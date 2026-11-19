import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { NotificationsScreen } from '../screens/NotificationsScreen';
import { notificationService } from '../services/NotificationService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
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
    { id: 'a', title: 'Nouvelle demande', body: 'Marie Curie demande un séjour.', link: '/profile/lists/offer.bookings.received', read: false, created_at: new Date().toISOString() },
    { id: 'b', title: 'Demande acceptée', body: 'Votre demande est acceptée.', link: 'https://exemple.test', read: true, created_at: '2026-01-02T10:00:00Z' },
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
    jest.clearAllMocks();
    jest.mocked(notificationService.list).mockResolvedValue(PAGE);
    jest.mocked(notificationService.unreadCount).mockResolvedValue(1);
    jest.mocked(notificationService.read).mockResolvedValue(undefined);
    jest.mocked(notificationService.readAll).mockResolvedValue(undefined);
  });

  it('la plus récente en tête, les non lues mises en avant', async () => {
    await show();

    expect(await screen.findByText('Nouvelle demande')).toBeTruthy();
    expect(screen.getByTestId('notification-a-unread')).toBeTruthy();
    expect(screen.queryByTestId('notification-b-unread')).toBeNull();
    expect(screen.getByText('Tout marquer comme lu')).toBeTruthy();
  });

  it('toucher une notification la marque lue et ouvre l’écran désigné', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notification-a'));

    expect(notificationService.read).toHaveBeenCalledWith('a');
    expect(router.push).toHaveBeenCalledWith('/profile/lists/offer.bookings.received');
    await waitFor(() => expect(screen.queryByTestId('notification-a-unread')).toBeNull());
  });

  it('une adresse externe n’est jamais ouverte ; une notification lue ne repart pas à l’API', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notification-b'));

    expect(router.push).not.toHaveBeenCalled();
    expect(notificationService.read).not.toHaveBeenCalled();
  });

  it('« Tout marquer comme lu »', async () => {
    await show();
    await fireEvent.press(await screen.findByTestId('notifications-read-all'));

    expect(notificationService.readAll).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('notification-a-unread')).toBeNull());
  });

  it('sans notification : le texte vide', async () => {
    jest.mocked(notificationService.list).mockResolvedValue({ items: [], next_cursor: null });
    await show();

    expect(await screen.findByTestId('notifications-empty')).toHaveTextContent("Aucune notification pour l'instant.");
    expect(screen.queryByTestId('notifications-read-all')).toBeNull();
  });
});
