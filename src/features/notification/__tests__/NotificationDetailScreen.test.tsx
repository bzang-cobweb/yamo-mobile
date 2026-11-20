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
  actor: { id: '37', name: 'Paul Etoa', initials: 'PE', photo: null, online: true, link: '/members/37' },
  summary: 'demande un séjour pour « Studio photos ».',
  message: 'Tournage d’un clip.',
  link: '/profile/lists/offer.bookings.received',
  links: [],
  text_links: [
    { text: 'Paul Etoa', link: '/members/37' },
    { text: 'Studio photos', link: '/offers/22' },
  ],
  link_label: 'Traiter la demande',
  booking: { id: '9', offer_id: '22', type: 'stay', status: 'pending', check_in: '2026-12-01', check_out: '2026-12-04', offer: { title: 'Studio photos', rental_type: 'Location meublée', bedrooms: '2 chambres' }, dates: ['Arrivée le 1 déc. 2026 à partir de 14:00', 'Départ le 4 déc. 2026 au plus tard à 11:00'], days_label: '3 jours', guests: 2, guests_label: '2 personnes', price_label: '85 000 FCFA / jour', total: '255 000 FCFA' },
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

  it('le suivi comme une conversation : l’autre à gauche, le lecteur à droite, « Toi » sans photo (décision 2026-11-20-suivi-conversation)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      history: [
        { id: 's1', label: 'Demande envoyée', actor: { id: '37', name: 'Membre', initials: 'ME', photo: null, online: false, link: '/members/37' }, message: 'Bonjour !', created_at: '2026-11-20T09:00:00Z' },
        { id: 's2', label: 'Demande acceptée', actor: { id: '4', name: 'Propriétaire', initials: 'PR', photo: null, online: false, link: '/members/4' }, message: null, created_at: '2026-11-20T10:00:00Z' },
        // Le lecteur (compte 1) : « Toi », sans photo.
        { id: 's3', label: 'Demande annulée', actor: { id: '1', name: 'Moi Même', initials: 'MM', photo: null, online: false, link: '/members/1' }, message: null, created_at: '2026-11-20T11:00:00Z', delivery: 'delivered' },
      ],
    });
    await show();

    expect(await screen.findByTestId('notification-history-0-actor')).toHaveTextContent('Membre');
    expect(screen.getByTestId('notification-history-0-message')).toHaveTextContent('Bonjour !');
    // Sans message : le libellé de l'étape.
    expect(screen.getByTestId('notification-history-1-message')).toHaveTextContent('Demande acceptée');
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-0').props.style)).toMatchObject({ alignSelf: 'flex-start' });
    // L'autre partie à gauche, même le propriétaire ; le lecteur à droite.
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-1').props.style)).toMatchObject({ alignSelf: 'flex-start' });
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-2').props.style)).toMatchObject({ alignSelf: 'flex-end' });
    // Les coches après la date d'une étape du lecteur seulement (décision 2026-11-20-coches-lecture).
    expect(screen.getByTestId('notification-history-2-delivery-delivered').props.accessibilityLabel).toBe('Reçue');
    expect(screen.queryByTestId('notification-history-1-delivery-sent')).toBeNull();
    // Le nom et la photo ouvrent la page du membre.
    await fireEvent.press(screen.getByTestId('notification-history-0-actor'));
    expect(router.push).toHaveBeenLastCalledWith('/members/37');
    await fireEvent.press(screen.getByTestId('notification-history-1-avatar'));
    expect(router.push).toHaveBeenLastCalledWith('/members/4');
    expect(screen.getByTestId('notification-history-2-actor')).toHaveTextContent('Toi');
    expect(screen.queryByText('Moi Même')).toBeNull();
    expect(screen.queryByTestId('notification-history-2-avatar')).toBeNull();
    // Le message et la date de la notification ouverte sont dans la conversation.
    expect(screen.queryByTestId('notification-detail-message')).toBeNull();
  });

  it('la barre du haut : le type ; la zone fixe : la pastille, le texte et le total, sans photo ni coordonnées ; ouverte, elle est marquée lue', async () => {
    await show();

    // Le type dans la barre du haut, à la place de « Notification ».
    expect(await screen.findByText('Demande de logement')).toBeTruthy();
    expect(screen.queryByText('Notification')).toBeNull();
    expect(screen.getByTestId('notification-detail-tag')).toHaveTextContent('En attente');
    // Une ligne : le type de location à gauche, la pastille à droite.
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-tag-row').props.style)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between' });
    // Une demande : ni texte ni titre composé, ses lignes seulement (décision 2026-11-20-titre-demande).
    expect(screen.queryByTestId('notification-detail-text')).toBeNull();
    expect(screen.queryByTestId('notification-detail-offer')).toBeNull();
    // Le type de location, après le nom de l'offre.
    expect(screen.getByTestId('notification-detail-rental-type')).toHaveTextContent('Location meublée');
    // Un séjour : l'arrivée et le départ, puis le nombre de personnes, après le texte.
    expect(screen.getByTestId('notification-detail-dates-0')).toHaveTextContent('Arrivée le 1 déc. 2026 à partir de 14:00');
    expect(screen.getByTestId('notification-detail-dates-1')).toHaveTextContent('Départ le 4 déc. 2026 au plus tard à 11:00');
    // La durée, avant le nombre de personnes.
    expect(screen.getByTestId('notification-detail-days')).toHaveTextContent('3 jours');
    // Les chambres, à droite des personnes.
    expect(screen.getByTestId('notification-detail-bedrooms')).toHaveTextContent('2 chambres');
    expect(screen.getByTestId('notification-detail-guests')).toHaveTextContent('2 personnes');
    // Une ligne : la durée à gauche, le total à droite.
    expect(screen.getByTestId('notification-detail-price')).toHaveTextContent('85 000 FCFA / jour');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-price-row').props.style)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between' });
    expect(screen.getByTestId('notification-detail-total')).toHaveTextContent('255 000 FCFA');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-total').props.style)).toMatchObject({ fontWeight: '700' });
    expect(screen.getByTestId('notification-detail-head')).toBeTruthy();
    expect(screen.queryByTestId('notification-detail-actor')).toBeNull();
    expect(screen.queryByTestId('notification-detail-avatar-online')).toBeNull();
    // Sans demande : le message, entier, puis la date à droite.
    expect(screen.getByText('Tournage d’un clip.').props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-date').props.style)).toMatchObject({ textAlign: 'right' });
    expect(screen.queryByTestId('notification-history')).toBeNull();
    expect(notificationService.get).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(notificationService.read).toHaveBeenCalledWith('n1'));
  });

  it('sans demande : le texte, sans le nom de qui agit, et ses liens', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({ ...NOTIFICATION, booking: undefined });
    await show();

    expect(await screen.findByTestId('notification-detail-text')).toHaveTextContent('demande un séjour pour « Studio photos ».');
    expect(screen.getByTestId('notification-detail-text')).not.toHaveTextContent('Paul Etoa');
    await fireEvent.press(screen.getByText('Studio photos'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
  });

  it('l’offre et le bouton ouvrent chacun leur écran', async () => {
    await show();

    // Le nom de l'offre, après la pastille, ouvre sa fiche.
    await fireEvent.press(await screen.findByTestId('notification-detail-offer-link'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-offer-link').props.style)).toMatchObject({ fontWeight: '700' });

    await fireEvent.press(screen.getByTestId('notification-detail-open-button'));
    expect(screen.getByTestId('notification-detail-open-button')).toHaveTextContent('Traiter la demande');
    expect(router.push).toHaveBeenLastCalledWith('/profile/lists/offer.bookings.received');
  });
});
