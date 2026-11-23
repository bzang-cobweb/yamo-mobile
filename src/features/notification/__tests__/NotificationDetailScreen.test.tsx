import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { NotificationDetailScreen } from '../screens/NotificationDetailScreen';
import { notificationService } from '../services/NotificationService';
import type { AppNotification } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
// L'icône, rendue comme une vue qui garde son nom et son testID.
jest.mock('expo-symbols', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SymbolView: (props: { testID?: string; name: unknown }) => <View testID={props.testID} {...({ name: props.name } as object)} /> };
});
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn(), useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));

const { router, useFocusEffect } = jest.requireMock<{ router: { push: jest.Mock }; useFocusEffect: jest.Mock }>('expo-router');

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
  booking: {
    id: '9', offer_id: '22', type: 'stay', status: 'pending', check_in: '2026-12-01', check_out: '2026-12-04', guests: 2,
    offer: { title: 'Studio photos', rental_type: 'Location meublée', property_type: 'Studio' },
    lines: [
      { key: 'member', label: 'Membre', value: 'Léa Membre', link: '/members/5' },
      { key: 'email', label: 'E-mail', value: 'lea@example.test' },
      { key: 'guests', label: 'Personnes', value: '2' },
      { key: 'arrival', label: 'Arrivée', value: '1 déc. 2026 à partir de 14:00' },
      { key: 'departure', label: 'Départ', value: '4 déc. 2026 au plus tard à 11:00' },
      { key: 'days', label: 'Durée', value: '3 jours' },
      { key: 'price', label: 'Prix', value: '85 000 FCFA / jour' },
      { key: 'total', label: 'Total', value: '255 000 FCFA' },
    ],
  },
  read: false,
  created_at: '2026-11-19T20:00:00Z',
};

// Le cache du test affiché : vidé avant de rendre les vrais services, pour qu'aucune requête encore en
// cours ne parte vers l'API une fois les doublures retirées.
let client: QueryClient | null = null;

async function show() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
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
  afterEach(async () => {
    await client?.cancelQueries();
    client?.clear();
    client = null;
    jest.restoreAllMocks();
  });

  it('le suivi comme une conversation : l’autre à gauche, le lecteur à droite, « Toi » sans photo (décision 2026-11-20-suivi-conversation)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      history: [
        { id: 's1', label: 'Demande envoyée', actor: { id: '37', name: 'Membre', initials: 'ME', photo: null, online: false, link: '/members/37' }, message: 'Bonjour !', created_at: '2026-11-20T09:00:00Z', edited: true },
        { id: 's2', label: 'Demande acceptée', actor: { id: '4', name: 'Propriétaire', initials: 'PR', photo: null, online: false, link: '/members/4' }, message: null, created_at: '2026-11-20T10:00:00Z' },
        // Le lecteur (compte 1) : « Toi », sans photo.
        { id: 's3', label: 'Demande annulée', actor: { id: '1', name: 'Moi Même', initials: 'MM', photo: null, online: false, link: '/members/1' }, message: null, created_at: '2026-11-20T11:00:00Z', delivery: 'delivered' },
      ],
    });
    await show();

    expect(await screen.findByTestId('notification-history-0-actor')).toHaveTextContent('Membre');
    expect(screen.getByTestId('notification-history-0-message')).toHaveTextContent('Bonjour !');
    // Une étape modifiée : « Modifié » avant sa date ; les autres, la date seule (décision 2026-11-21-etape-modifiee-date).
    expect(screen.getByTestId('notification-history-0-date')).toHaveTextContent(/^Modifié /);
    expect(screen.getByTestId('notification-history-1-date')).not.toHaveTextContent(/Modifié/);
    // Sans message : le libellé de l'étape.
    expect(screen.getByTestId('notification-history-1-message')).toHaveTextContent('Demande acceptée');
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-0').props.style)).toMatchObject({ alignSelf: 'flex-start' });
    // L'autre partie à gauche, même le propriétaire ; le lecteur à droite.
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-1').props.style)).toMatchObject({ alignSelf: 'flex-start' });
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-2').props.style)).toMatchObject({ alignSelf: 'flex-end' });
    // Les coches après la date d'une étape du lecteur seulement (décision 2026-11-20-coches-lecture).
    expect(screen.getByTestId('notification-history-2-delivery-delivered').props.accessibilityLabel).toBe('Reçue');
    expect(screen.queryByTestId('notification-history-1-delivery-sent')).toBeNull();
    // Le nom ouvre la page du membre.
    await fireEvent.press(screen.getByTestId('notification-history-0-actor'));
    expect(router.push).toHaveBeenLastCalledWith('/members/37');
    await fireEvent.press(screen.getByTestId('notification-history-1-actor'));
    expect(router.push).toHaveBeenLastCalledWith('/members/4');
    // Plus de photo, ni pour l'autre ni pour le lecteur (décision 2026-11-21-conversation-sans-photo).
    expect(screen.queryByTestId('notification-history-0-avatar')).toBeNull();
    expect(screen.queryByTestId('notification-history-1-avatar')).toBeNull();
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
    // Le statut seul, à gauche (décision 2026-11-22-detail-sans-ligne-type).
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-tag-row').props.style)).toMatchObject({ flexDirection: 'row', justifyContent: 'flex-start' });
    // Une demande : ni texte ni titre composé, ses lignes seulement (décision 2026-11-20-titre-demande).
    expect(screen.queryByTestId('notification-detail-text')).toBeNull();
    expect(screen.queryByTestId('notification-detail-offer')).toBeNull();
    // Plus de ligne du type : il est dans la barre du haut (décision 2026-11-22-detail-sans-ligne-type).
    expect(screen.queryByTestId('notification-detail-rental-type')).toBeNull();
    // La suite derrière « Voir plus » : on la déplie.
    await fireEvent.press(screen.getByTestId('notification-detail-more'));
    // Les lignes, dans l'ordre servi, le libellé à gauche et la valeur à droite (décision 2026-11-20-lignes-demande).
    const keys = ['guests', 'arrival', 'departure', 'days', 'price', 'total'];
    const json = JSON.stringify(screen.toJSON());
    expect(keys.map((key) => json.indexOf(`"notification-detail-line-${key}"`))).toEqual([...keys.map((key) => json.indexOf(`"notification-detail-line-${key}"`))].sort((a, b) => a - b));
    expect(screen.getByTestId('notification-detail-line-arrival-label')).toHaveTextContent('Arrivée');
    expect(screen.getByTestId('notification-detail-line-arrival-value')).toHaveTextContent('1 déc. 2026 à partir de 14:00');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-line-price').props.style)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between' });
    expect(screen.getByTestId('notification-detail-line-price-value')).toHaveTextContent('85 000 FCFA / jour');
    // Le total en gras.
    expect(screen.getByTestId('notification-detail-line-total-value')).toHaveTextContent('255 000 FCFA');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-line-total-value').props.style)).toMatchObject({ fontWeight: '700' });
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

  it('les lignes jusqu’au départ, puis « Voir plus » déplie la suite ; le bouton ouvre son écran', async () => {
    await show();

    // Jusqu'au départ, toujours visibles ; la suite derrière « Voir plus » (décision 2026-11-21-detail-reservation-voir-plus).
    await screen.findByTestId('notification-detail-more');
    // Les deux premières lignes, toujours ; la suite derrière « Voir plus » (décision 2026-11-21-voir-plus-apres-deux-lignes).
    expect(screen.getByTestId('notification-detail-line-member')).toBeTruthy();
    expect(screen.getByTestId('notification-detail-line-email')).toBeTruthy();
    expect(screen.queryByTestId('notification-detail-line-guests')).toBeNull();
    expect(screen.queryByTestId('notification-detail-line-arrival')).toBeNull();
    expect(screen.queryByTestId('notification-detail-line-days')).toBeNull();
    expect(screen.queryByTestId('notification-detail-line-total')).toBeNull();
    expect(screen.getByTestId('notification-detail-more')).toHaveTextContent('Voir plus');
    // Sans icône (décision 2026-11-21-detail-reservation-voir-plus).
    expect(screen.queryByTestId('notification-detail-more-icon')).toBeNull();
    expect(screen.getByTestId('notification-detail-more').props.accessibilityState).toEqual({ expanded: false });
    // Le nom de l'offre, en gras, ouvre la fiche du logement ; plus de « Voir le logement ».
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-offer-title').props.style)).toMatchObject({ color: '#000000', fontWeight: '700' });
    expect(screen.queryByTestId('notification-detail-offer-view')).toBeNull();
    // Plus de titre composé ni de dates en tête : ce sont les premières lignes de la demande (décision
    // 2026-11-22-detail-lignes-titre-dates-adresse).
    expect(screen.queryByTestId('notification-detail-composed-title')).toBeNull();
    expect(screen.queryByTestId('notification-detail-period')).toBeNull();
    await fireEvent.press(screen.getByTestId('notification-detail-offer-title'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
    await fireEvent.press(screen.getByTestId('notification-detail-more'));
    expect(screen.getByTestId('notification-detail-line-total')).toBeTruthy();
    expect(screen.getByTestId('notification-detail-more')).toHaveTextContent('Voir moins');
    // À la fin, même dépliée, alignée à droite.
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"notification-detail-more"')).toBeGreaterThan(json.indexOf('"notification-detail-line-total"'));
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-more').props.style)).toMatchObject({ alignSelf: 'flex-end' });
    expect(screen.queryByTestId('notification-detail-offer-view')).toBeNull();
    // L'autre partie : son nom ouvre sa page ; l'e-mail est un texte (décision 2026-11-21-detail-reservation-contact).
    expect(screen.getByTestId('notification-detail-line-email-value')).toHaveTextContent('lea@example.test');
    await fireEvent.press(screen.getByTestId('notification-detail-line-member-value'));
    expect(router.push).toHaveBeenLastCalledWith('/members/5');
    await fireEvent.press(screen.getByTestId('notification-detail-more'));
    expect(screen.queryByTestId('notification-detail-line-total')).toBeNull();

    await fireEvent.press(screen.getByTestId('notification-detail-open-button'));
    expect(screen.getByTestId('notification-detail-open-button')).toHaveTextContent('Traiter la demande');
    expect(screen.queryByTestId('notification-detail-open-secondary')).toBeNull();
    expect(router.push).toHaveBeenLastCalledWith('/profile/lists/offer.bookings.received');
  });

  it('le membre, demande en attente : « Modifier » ouvre le formulaire ; au retour, la demande est relue (décision 2026-11-21-detail-reservation-modifier)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      link: '/profile/offer.booking.edit?record=9',
      link_label: 'Modifier',
      secondary_link: '/profile/offer.booking.cancel?record=9',
      secondary_link_label: 'Annuler',
    });
    await show();

    await fireEvent.press(await screen.findByTestId('notification-detail-open-button'));
    expect(screen.getByTestId('notification-detail-open-button')).toHaveTextContent('Modifier');
    expect(router.push).toHaveBeenLastCalledWith('/profile/offer.booking.edit?record=9');
    // « Annuler », à gauche, ouvre le formulaire d'annulation (décision 2026-11-21-annuler-depuis-le-detail).
    expect(screen.getByTestId('notification-detail-open-secondary')).toHaveTextContent('Annuler');
    await fireEvent.press(screen.getByTestId('notification-detail-open-secondary'));
    expect(router.push).toHaveBeenLastCalledWith('/profile/offer.booking.cancel?record=9');

    // La première mise au premier plan ne relit rien ; la suivante (retour du formulaire), si.
    const focus = useFocusEffect.mock.calls.at(-1)?.[0] as () => void;
    focus();
    expect(notificationService.get).toHaveBeenCalledTimes(1);
    await act(async () => focus());
    expect(notificationService.get).toHaveBeenCalledTimes(2);
  });
});
