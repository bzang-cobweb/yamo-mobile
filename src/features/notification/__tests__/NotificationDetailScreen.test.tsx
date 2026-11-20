import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const NOTIFICATION: AppNotification = {
  id: 'n1',
  title: 'Demande de logement',
  tag: { label: 'En attente', tone: 'warning' },
  body: 'Paul Etoa demande un séjour pour « Studio photos ».',
  actor: { id: '37', name: 'Paul Etoa', initials: 'PE', photo: null, online: true, link: '/members/37', email: 'paul@example.test', phone: '+237 6 90 00 00 99' },
  summary: 'demande un séjour pour « Studio photos ».',
  message: 'Tournage d’un clip.',
  link: '/profile/lists/offer.bookings.received',
  links: [],
  text_links: [
    { text: 'Paul Etoa', link: '/members/37' },
    { text: 'Studio photos', link: '/offers/22' },
  ],
  link_label: 'Traiter la demande',
  total: '255 000 FCFA',
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

  it('le suivi de la demande, de la plus ancienne étape à la plus récente (décision 2026-11-20-suivi-demande)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      history: [
        { id: 's1', label: 'Demande envoyée', actor: { id: '37', name: 'Membre', initials: 'ME', photo: null, online: false, link: '/members/37' }, message: 'Bonjour !', created_at: '2026-11-20T09:00:00Z' },
        { id: 's2', label: 'Demande refusée', actor: { id: '4', name: 'Propriétaire', initials: 'PR', photo: null, online: false, link: '/members/4' }, message: 'Déjà réservé', created_at: '2026-11-20T10:00:00Z' },
      ],
    });
    await show();

    expect(await screen.findByText('Suivi de la demande')).toBeTruthy();
    expect(screen.getByTestId('notification-history-0-label')).toHaveTextContent('Demande envoyée');
    expect(screen.getByTestId('notification-history-0-actor')).toHaveTextContent('Membre');
    expect(screen.getByTestId('notification-history-1-label')).toHaveTextContent('Demande refusée');
    expect(screen.getByTestId('notification-history-1-message')).toHaveTextContent('Déjà réservé');
    expect(screen.getByTestId('notification-history-1-date')).toBeTruthy();
  });

  it('sans demande, pas de suivi', async () => {
    await show();

    expect(await screen.findByTestId('notification-detail-actor')).toBeTruthy();
    expect(screen.queryByTestId('notification-history')).toBeNull();
  });

  it('qui agit à la place du titre, son statut, sa date, son texte, son message ; ouverte, elle est marquée lue', async () => {
    await show();

    // À la place du titre : qui agit.
    expect(await screen.findByTestId('notification-detail-actor')).toHaveTextContent('Paul Etoa');
    // Le type en gras, sous qui agit, puis le statut.
    expect(screen.getByTestId('notification-detail-type')).toHaveTextContent('Demande de logement');
    expect(notificationService.get).toHaveBeenCalledWith('n1');
    expect(screen.getByText('Notification')).toBeTruthy();
    expect(screen.getByText('En attente')).toBeTruthy();
    expect(screen.getByTestId('notification-detail-date')).toHaveTextContent(/2026/);
    // Ses coordonnées sous son nom ; la date après le message, alignée à droite.
    expect(screen.getByTestId('notification-detail-email')).toHaveTextContent('paul@example.test');
    expect(screen.getByTestId('notification-detail-total')).toHaveTextContent('255 000 FCFA');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-total').props.style)).toMatchObject({ fontWeight: '700' });
    expect(screen.getByTestId('notification-detail-phone')).toHaveTextContent('+237 6 90 00 00 99');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-date').props.style)).toMatchObject({ textAlign: 'right' });
    // Qui agit, comme sur la carte ; le texte sans son nom.
    expect(screen.getByTestId('notification-detail-avatar-online')).toBeTruthy();
    expect(screen.getByTestId('notification-detail-actor')).toHaveTextContent('Paul Etoa');
    expect(screen.getByTestId('notification-detail-text')).not.toHaveTextContent('Paul Etoa');
    // Le message, entier (pas tronqué comme sur la carte).
    expect(screen.getByText('Tournage d’un clip.').props.numberOfLines).toBeUndefined();
    await waitFor(() => expect(notificationService.read).toHaveBeenCalledWith('n1'));
  });

  it('le membre (nom, photo), l’offre et le bouton ouvrent chacun leur écran', async () => {
    await show();

    await fireEvent.press(await screen.findByText('Paul Etoa'));
    expect(router.push).toHaveBeenLastCalledWith('/members/37');
    await fireEvent.press(screen.getByTestId('notification-detail-avatar-online'));
    expect(router.push).toHaveBeenLastCalledWith('/members/37');
    await fireEvent.press(screen.getByText('Studio photos'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
    await fireEvent.press(screen.getByTestId('notification-detail-open-button'));
    expect(screen.getByTestId('notification-detail-open-button')).toHaveTextContent('Traiter la demande');
    expect(router.push).toHaveBeenLastCalledWith('/profile/lists/offer.bookings.received');
  });
});
