import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { currentToast } from '@/shared/components/Toast';
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

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 1 } }) }));
// Le formulaire du profil : un bouton qui l'envoie ; son titre, servi par sa définition.
jest.mock('@/features/form/hooks/useFormDefinition', () => ({ useFormDefinition: () => ({ data: { title: 'Modifier la demande de séjour' } }) }));
jest.mock('@/features/auth/screens/ProfileFormScreen', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    profileContentStyle: {},
    formTitle: (definition?: { title?: string }) => definition?.title ?? '',
    ProfileForm: ({ form, record, onDone }: { form: string; record?: string; onDone: (success: { action: string; message: string }) => void }) => (
      <Pressable testID="profile-form" onPress={() => onDone({ action: 'back', message: 'Demande modifiée.' })}>
        <Text>{`${form}:${record}`}</Text>
      </Pressable>
    ),
  };
});

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
  heading: { title: 'Studio photos', subtitle: 'Location meublée · Studio', link: '/offers/22' },
  booking: {
    id: '9', offer_id: '22', type: 'stay', status: 'pending', check_in: '2026-12-01', check_out: '2026-12-04', guests: 2,
    offer: { title: 'Studio photos', rental_type: 'Location meublée', property_type: 'Studio' },
    composed_title: 'Location meublée · Studio',
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
  menu: [{ key: 'info', label: 'Info', link: null }],
  read: false,
  created_at: '2026-11-19T20:00:00Z',
  date: 'hier à 20:00',
  stamp: 'jeudi 19 novembre 2026 20:00',
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
        { id: 's1', label: 'Demande envoyée', actor: { id: '37', name: 'Membre', initials: 'ME', photo: null, online: false, link: '/members/37' }, message: 'Bonjour !', created_at: '2026-11-20T09:00:00Z', stamp: '20 nov. 2026 09:00', edited: true },
        { id: 's2', label: 'Demande acceptée', actor: { id: '4', name: 'Propriétaire', initials: 'PR', photo: null, online: false, link: '/members/4' }, message: null, created_at: '2026-11-20T10:00:00Z', stamp: '20 nov. 2026 10:00' },
        // Le lecteur (compte 1) : « Toi », sans photo.
        { id: 's3', label: 'Demande annulée', actor: { id: '1', name: 'Moi Même', initials: 'MM', photo: null, online: false, link: '/members/1' }, message: null, created_at: '2026-11-20T11:00:00Z', stamp: '20 nov. 2026 11:00', delivery: 'delivered' },
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
    // Le lien sur le nom seul (décision 2026-11-22-liens-sur-le-texte).
    expect(StyleSheet.flatten(screen.getByTestId('notification-history-0-actor').props.style)).toMatchObject({ alignSelf: 'flex-start' });
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

  it('la barre du haut : le titre de l’en-tête ; plus de zone fixe, la page n’est que le fil ; ouverte, elle est marquée lue', async () => {
    await show();

    // Dans la barre du haut, le titre de l'en-tête (décision 2026-11-27-page-titre-entete), à la place de « Notification ».
    await waitFor(() => expect(screen.getByTestId('back-header-title')).toHaveTextContent('Studio photos'));
    expect(screen.queryByText('Notification')).toBeNull();
    // Plus de zone fixe en haut : ni pastille, ni en-tête, ni lignes, ni « Voir plus » (décision 2026-11-27-detail-sans-zone-fixe).
    expect(screen.queryByTestId('notification-detail-head')).toBeNull();
    expect(screen.queryByTestId('notification-detail-tag')).toBeNull();
    expect(screen.queryByTestId('notification-detail-heading-title')).toBeNull();
    expect(screen.queryByTestId('notification-detail-line-member')).toBeNull();
    expect(screen.queryByTestId('notification-detail-more')).toBeNull();
    expect(screen.queryByTestId('notification-detail-actor')).toBeNull();
    expect(screen.queryByTestId('notification-detail-avatar-online')).toBeNull();
    // Sans suivi : le message, entier, puis la date à droite.
    expect(screen.getByText('Tournage d’un clip.').props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-date').props.style)).toMatchObject({ textAlign: 'right' });
    expect(screen.queryByTestId('notification-history')).toBeNull();
    expect(notificationService.get).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(notificationService.read).toHaveBeenCalledWith('n1'));
  });

  it('le menu ⋮ de la barre du haut : « Info » ouvre un panneau titré « Info », l’en-tête et toutes les lignes (décision 2026-11-27-notification-menu-info)', async () => {
    await show();

    expect(screen.queryByTestId('notification-detail-menu-list')).toBeNull();
    await fireEvent.press(await screen.findByTestId('notification-detail-menu-toggle'));
    expect(screen.getByTestId('notification-detail-menu-info')).toHaveTextContent('Info');
    // Un toucher ailleurs ferme le menu.
    await fireEvent.press(screen.getByTestId('notification-detail-menu-backdrop', { includeHiddenElements: true }));
    expect(screen.queryByTestId('notification-detail-menu-list')).toBeNull();

    await fireEvent.press(screen.getByTestId('notification-detail-menu-toggle'));
    await fireEvent.press(screen.getByTestId('notification-detail-menu-info'));
    expect(screen.queryByTestId('notification-detail-menu-list')).toBeNull();
    // Titré du libellé de son entrée du menu (décision 2026-11-27-info-titre-du-menu).
    expect(screen.getByTestId('notification-detail-info-header')).toHaveTextContent('Info');
    expect(screen.getByTestId('notification-detail-info-title')).toHaveTextContent('Studio photos');
    expect(screen.getByTestId('notification-detail-info-subtitle')).toHaveTextContent('Location meublée · Studio');
    expect(screen.getByTestId('notification-detail-info-line-total-value')).toHaveTextContent('255 000 FCFA');
    expect(screen.getAllByTestId(/^notification-detail-info-line-[a-z]+$/)).toHaveLength(8);
    // La pastille du statut, en tête ; une demande : ni texte, ses lignes dans l'ordre servi.
    expect(screen.getByTestId('notification-detail-tag')).toHaveTextContent('En attente');
    expect(screen.queryByTestId('notification-detail-text')).toBeNull();
    const keys = ['guests', 'arrival', 'departure', 'days', 'price', 'total'];
    const json = JSON.stringify(screen.toJSON());
    expect(keys.map((key) => json.indexOf(`"notification-detail-info-line-${key}"`))).toEqual([...keys.map((key) => json.indexOf(`"notification-detail-info-line-${key}"`))].sort((a, b) => a - b));
    // « Arrivée : », une espace insécable avant les deux-points (décision 2026-11-22-detail-libelles-deux-points).
    expect(screen.getByTestId('notification-detail-info-line-arrival-label').props.children).toBe('Arrivée\u00a0:');
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-info-line-arrival').props.style)).toMatchObject({ alignItems: 'flex-start' });
    expect(StyleSheet.flatten(screen.getByTestId('notification-detail-info-line-total-value').props.style)).toMatchObject({ fontWeight: '700' });
    expect(screen.getByTestId('notification-detail-info-line-email-value')).toHaveTextContent('lea@example.test');
    // Le nom du logement ouvre sa fiche, le panneau fermé.
    expect(screen.getByTestId('notification-detail-info-title').props.accessibilityRole).toBe('link');
    await fireEvent.press(screen.getByTestId('notification-detail-info-title'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
    expect(screen.queryByTestId('notification-detail-info-line-total')).toBeNull();
    // Le nom de l'autre partie ouvre sa page.
    await fireEvent.press(screen.getByTestId('notification-detail-menu-toggle'));
    await fireEvent.press(screen.getByTestId('notification-detail-menu-info'));
    await fireEvent.press(screen.getByTestId('notification-detail-info-line-member-value'));
    expect(router.push).toHaveBeenLastCalledWith('/members/5');
  });

  it('le menu ⋮ servi par le serveur : un lien ouvre son écran, une entrée inconnue est ignorée ; sans entrée, pas de menu (décision 2026-11-27-menu-notification-serveur)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      menu: [
        { key: 'info', label: 'Détails', link: null },
        { key: 'partner', label: 'Voir le partenaire', link: '/partners/18' },
        { key: 'unknown', label: 'Inconnue', link: null },
      ],
    });
    await show();

    await fireEvent.press(await screen.findByTestId('notification-detail-menu-toggle'));
    expect(screen.queryByTestId('notification-detail-menu-unknown')).toBeNull();
    await fireEvent.press(screen.getByTestId('notification-detail-menu-partner'));
    expect(router.push).toHaveBeenLastCalledWith('/partners/18');
    // « Info » : titré du libellé servi.
    await fireEvent.press(screen.getByTestId('notification-detail-menu-toggle'));
    await fireEvent.press(screen.getByTestId('notification-detail-menu-info'));
    expect(screen.getByTestId('notification-detail-info-header')).toHaveTextContent('Détails');
  });

  it('sans menu servi : pas de bouton ⋮', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({ ...NOTIFICATION, menu: [] });
    await show();

    await screen.findByTestId('notification-detail-scroll');
    expect(screen.queryByTestId('notification-detail-menu-toggle')).toBeNull();
  });

  it('sans en-tête ni demande : dans « Info », le texte, sans le nom de qui agit, et ses liens', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({ ...NOTIFICATION, heading: null, booking: undefined });
    await show();
    // Sans en-tête, le titre de la notification dans la barre du haut.
    await waitFor(() => expect(screen.getByTestId('back-header-title')).toHaveTextContent('Demande de logement'));

    await fireEvent.press(screen.getByTestId('notification-detail-menu-toggle'));
    await fireEvent.press(screen.getByTestId('notification-detail-menu-info'));
    expect(screen.queryByTestId('notification-detail-info-title')).toBeNull();
    expect(screen.getByTestId('notification-detail-text')).toHaveTextContent('demande un séjour pour « Studio photos ».');
    expect(screen.getByTestId('notification-detail-text')).not.toHaveTextContent('Paul Etoa');
    await fireEvent.press(screen.getByText('Studio photos'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/22');
    expect(screen.queryByTestId('notification-detail-text')).toBeNull();
  });

  it('un partenaire : ses dernières modifications en lignes sous l’en-tête (décision 2026-11-26-partenaire-dernieres-modifications)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      heading: { title: 'Déménagement Express', subtitle: 'En une journée.', link: '/partners/18' },
      booking: undefined,
      lines_title: 'Modifications',
      lines: [
        { key: 'slogan', label: 'Slogan', value: '« En une journée. » → « En une journée, sans casse. »' },
        { key: 'website', label: 'Lien', value: '(vide) → « https://demenagement.test »' },
        { key: 'description', label: 'Description', value: '« Camions. » → « Camions et cartons. »' },
      ],
    });
    await show();

    // Dans « Info », sous l'en-tête : les lignes, titrées « Modifications » par le serveur.
    await fireEvent.press(await screen.findByTestId('notification-detail-menu-toggle'));
    await fireEvent.press(screen.getByTestId('notification-detail-menu-info'));
    expect(screen.getByTestId('notification-detail-info-lines-title')).toHaveTextContent('Modifications');
    expect(screen.getByTestId('notification-detail-info-line-slogan-value')).toHaveTextContent('« En une journée. » → « En une journée, sans casse. »');
    expect(screen.getByTestId('notification-detail-info-line-website-label')).toHaveTextContent('Lien\u00a0:');
    expect(screen.getByTestId('notification-detail-info-line-description')).toBeTruthy();
  });

  it('un en-tête sans lien ni sous-titre, sans demande : le titre seul, pas de texte ni de lignes (décision 2026-11-26-booking-summary)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({ ...NOTIFICATION, heading: { title: 'Agence du port', subtitle: null, link: null }, booking: undefined });
    await show();

    await fireEvent.press(await screen.findByTestId('notification-detail-menu-toggle'));
    await fireEvent.press(screen.getByTestId('notification-detail-menu-info'));
    expect(screen.getByTestId('notification-detail-info-title')).toHaveTextContent('Agence du port');
    expect(screen.getByTestId('notification-detail-info-title').props.accessibilityRole).toBeUndefined();
    expect(screen.queryByTestId('notification-detail-info-subtitle')).toBeNull();
    expect(screen.queryByTestId('notification-detail-text')).toBeNull();
    expect(screen.queryByTestId('notification-detail-info-line-member')).toBeNull();
  });

  it('le bouton du bas ouvre son écran', async () => {
    await show();

    await fireEvent.press(await screen.findByTestId('notification-detail-open-button'));
    expect(screen.getByTestId('notification-detail-open-button')).toHaveTextContent('Traiter la demande');
    expect(screen.queryByTestId('notification-detail-open-secondary')).toBeNull();
    expect(router.push).toHaveBeenLastCalledWith('/profile/lists/offer.bookings.received');
  });

  it('le membre, demande en attente : « Modifier » et « Annuler » ouvrent leur formulaire dans un panneau ; envoyé, il se ferme et la demande est relue (décision 2026-11-26-formulaires-en-panneau)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({
      ...NOTIFICATION,
      link: '/profile/offer.booking.edit?record=9',
      link_label: 'Modifier',
      secondary_link: '/profile/offer.booking.cancel?record=9',
      secondary_link_label: 'Annuler',
    });
    await show();

    expect(await screen.findByTestId('notification-detail-open-button')).toHaveTextContent('Modifier');
    await fireEvent.press(screen.getByTestId('notification-detail-open-button'));
    // Le panneau, pas un écran : titré par le formulaire, le formulaire et son enregistrement dedans.
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByTestId('notification-detail-form-header')).toHaveTextContent('Modifier la demande de séjour');
    expect(screen.getByTestId('profile-form')).toHaveTextContent('offer.booking.edit:9');

    // Envoyé : le panneau se ferme, le message s'affiche, la demande est relue.
    await act(async () => fireEvent.press(screen.getByTestId('profile-form')));
    expect(screen.queryByTestId('notification-detail-form')).toBeNull();
    expect(currentToast()?.message).toBe('Demande modifiée.');
    expect(notificationService.get).toHaveBeenCalledTimes(2);

    // « Annuler », à gauche (décision 2026-11-21-annuler-depuis-le-detail) : son formulaire ; la croix le ferme sans envoyer.
    expect(screen.getByTestId('notification-detail-open-secondary')).toHaveTextContent('Annuler');
    await fireEvent.press(screen.getByTestId('notification-detail-open-secondary'));
    expect(screen.getByTestId('profile-form')).toHaveTextContent('offer.booking.cancel:9');
    await fireEvent.press(screen.getByTestId('notification-detail-form-close'));
    expect(screen.queryByTestId('notification-detail-form')).toBeNull();
    expect(notificationService.get).toHaveBeenCalledTimes(2);
  });

  it('un bouton vers un autre écran que le profil (« Laisser un avis ») l’ouvre ; au retour, la demande est relue (décision 2026-11-21-detail-reservation-modifier)', async () => {
    jest.spyOn(notificationService, 'get').mockResolvedValue({ ...NOTIFICATION, link: '/offers/5/review', link_label: 'Laisser un avis' });
    await show();

    await fireEvent.press(await screen.findByTestId('notification-detail-open-button'));
    expect(router.push).toHaveBeenLastCalledWith('/offers/5/review');
    expect(screen.queryByTestId('notification-detail-form')).toBeNull();

    // La première mise au premier plan ne relit rien ; la suivante (retour de l'écran), si.
    const focus = useFocusEffect.mock.calls.at(-1)?.[0] as () => void;
    focus();
    expect(notificationService.get).toHaveBeenCalledTimes(1);
    await act(async () => focus());
    expect(notificationService.get).toHaveBeenCalledTimes(2);
  });
});
