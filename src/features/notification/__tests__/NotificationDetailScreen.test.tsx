import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { NotificationDetailScreen } from '../screens/NotificationDetailScreen';
import { notificationService } from '../services/NotificationService';
import type { AppNotification } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn(), useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
});
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const NOTIFICATION: AppNotification = {
  id: 'n1',
  title: 'Demande de logement',
  tag: { label: 'En attente', tone: 'warning' },
  body: 'Paul Etoa demande un séjour pour « Studio photos ».',
  message: 'Tournage d’un clip.',
  link: '/profile/lists/offer.bookings.received',
  links: [],
  text_links: [
    { text: 'Paul Etoa', link: '/members/37' },
    { text: 'Studio photos', link: '/offers/22' },
  ],
  link_label: 'Réservations reçues',
  read: false,
  created_at: '2026-11-19T20:00:00Z',
};

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <NotificationDetailScreen id="n1" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('NotificationDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(notificationService, 'get').mockResolvedValue(NOTIFICATION);
    jest.spyOn(notificationService, 'read').mockResolvedValue(undefined);
    jest.spyOn(notificationService, 'unreadCount').mockResolvedValue(0);
  });
  afterEach(() => jest.restoreAllMocks());

  it('son titre, son statut, sa date, son texte, son message ; ouverte, elle est marquée lue', async () => {
    await show();

    expect(await screen.findByTestId('notification-detail-title')).toHaveTextContent('Demande de logement');
    expect(notificationService.get).toHaveBeenCalledWith('n1');
    expect(screen.getByText('Notification')).toBeTruthy();
    expect(screen.getByText('En attente')).toBeTruthy();
    expect(screen.getByTestId('notification-detail-date')).toHaveTextContent(/2026/);
    expect(screen.getByText('Tournage d’un clip.')).toBeTruthy();
    await waitFor(() => expect(notificationService.read).toHaveBeenCalledWith('n1'));
  });

  it('le membre, l’offre et le bouton ouvrent chacun leur écran', async () => {
    await show();

    await fireEvent.press(await screen.findByText('Paul Etoa'));
    expect(router.push).toHaveBeenLastCalledWith('/members/37');
    await fireEvent.press(screen.getByText('Studio photos'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
    await fireEvent.press(screen.getByText('Réservations reçues'));
    expect(router.push).toHaveBeenLastCalledWith('/profile/lists/offer.bookings.received');
  });
});
