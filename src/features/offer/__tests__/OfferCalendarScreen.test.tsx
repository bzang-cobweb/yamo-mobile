import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';

import { profileFormService } from '@/features/auth/services/ProfileFormService';
import { ApiError } from '@/shared/api/errors';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TONE_COLORS } from '@/shared/components/StatusTag';

import { OfferCalendarScreen } from '../screens/OfferCalendarScreen';
import { offerService } from '../services/OfferService';
import type { OfferCalendarMonth } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn(), useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

const DECEMBER: OfferCalendarMonth = {
  title: 'Calendrier',
  heading: 'Studio photos',
  composed_title: 'Location meublée · Studio · Douala',
  address: 'Rue Njo-Njo, Bonapriso, 00237 Douala, Cameroun',
  indication: 'Portail vert, 2e étage.',
  month: '2026-12',
  label: 'Décembre 2026',
  previous: '2026-11',
  next: '2027-01',
  weekdays: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  offset: 1,
  days: [
    { date: '2026-12-01', day: 1, state: 'accepted', dot: null },
    { date: '2026-12-02', day: 2, state: 'conflict', dot: null },
    { date: '2026-12-03', day: 3, state: 'free', dot: 'warning' },
  ],
  legend: [{ kind: 'day', tone: 'accepted', label: 'Séjour accepté' }],
};

const BLOCK = {
  label: 'Bloquer ce jour',
  style: 'destructive',
  confirm: 'Bloquer ce jour ?',
  submission: { method: 'PUT', endpoint: '/v1/offers/7/blocked-dates/2026-12-03', destructive: false, success: { action: 'back', message: 'Jour bloqué.' } },
  form: null,
};

async function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <I18nContext.Provider value={TEST_I18N}>
        <OfferCalendarScreen id="7" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

describe('OfferCalendarScreen (décision 2026-11-19-contrat-calendrier-offre)', () => {
  beforeEach(() => {
    jest.spyOn(offerService, 'calendar').mockResolvedValue(DECEMBER);
    jest.spyOn(offerService, 'calendarDay').mockResolvedValue({
      title: 'Jeudi 3 décembre 2026',
      items: [
        {
          id: '9',
          title: 'Marie Curie',
          subtitle: 'Séjour · du 3 déc. 2026 au 6 déc. 2026',
          image: null,
          rating: null,
          highlight: null,
          date: '2026-11-19T10:00:00Z',
          date_text: '19 nov. 2026 11:00',
          tag: { label: 'En attente', tone: 'warning' },
          link: '/notifications/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
          edit: null,
          delete: null,
          actions: [
            { label: 'Accepter', style: 'primary', confirm: null, submission: null, form: { form: 'offer.booking.accept', record: '9' }, link: null },
            { label: 'Refuser', style: 'destructive', confirm: null, submission: null, form: { form: 'offer.booking.refuse', record: '9' }, link: null },
          ],
        },
      ],
      empty: 'Aucune demande ce jour-là.',
      action: BLOCK,
      note: null,
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('le mois en grille, ses couleurs, ses points et sa légende ; les flèches changent de mois', async () => {
    await show();

    expect(await screen.findByText('Décembre 2026')).toBeTruthy();
    expect(screen.getByTestId('offer-calendar-heading')).toHaveTextContent('Studio photos');
    // À la taille du texte, en gras (décision 2026-11-22-calendrier-titre-taille-texte).
    const size = (id: string) => (StyleSheet.flatten(screen.getByTestId(id).props.style) as { fontSize?: number }).fontSize;
    // Dessous, le titre composé et l'adresse en petit, comme sur la page d'une demande (décision
    // 2026-11-22-calendrier-textes-comme-detail).
    expect(size('offer-calendar-composed-title')).toBe(14);
    expect(size('offer-calendar-address')).toBe(14);
    expect(size('offer-calendar-heading')).toBe(16);
    expect(StyleSheet.flatten(screen.getByTestId('offer-calendar-heading').props.style)).toMatchObject({ fontWeight: '700' });
    expect(screen.getByTestId('offer-calendar-composed-title')).toHaveTextContent('Location meublée · Studio · Douala');
    expect(screen.getByTestId('offer-calendar-address')).toHaveTextContent('Rue Njo-Njo, Bonapriso, 00237 Douala, Cameroun');
    expect(screen.getByTestId('offer-calendar-indication')).toHaveTextContent('Portail vert, 2e étage.');
    expect(screen.getByText('Calendrier')).toBeTruthy();
    expect(offerService.calendar).toHaveBeenCalledWith('7', null);
    expect(StyleSheet.flatten(screen.getByTestId('offer-calendar-day-2026-12-01').props.style)).toMatchObject({ backgroundColor: '#2E9D5B' });
    expect(StyleSheet.flatten(screen.getByTestId('offer-calendar-day-2026-12-02').props.style)).toMatchObject({ backgroundColor: TONE_COLORS.danger });
    expect(screen.getByTestId('offer-calendar-dot-2026-12-03')).toBeTruthy();
    expect(screen.getByText('Séjour accepté')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('offer-calendar-next'));
    await waitFor(() => expect(offerService.calendar).toHaveBeenLastCalledWith('7', '2027-01'));
  });

  it('toucher un jour ouvre son panneau : ses demandes, et « Bloquer ce jour » après confirmation', async () => {
    const submit = jest.spyOn(profileFormService, 'submit').mockResolvedValue({ kind: 'none' });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await show();

    await fireEvent.press(await screen.findByTestId('offer-calendar-day-2026-12-03'));
    expect(await screen.findByText('Jeudi 3 décembre 2026')).toBeTruthy();
    expect(offerService.calendarDay).toHaveBeenCalledWith('7', '2026-12-03');
    // La carte de « Demandes reçues » (décision 2026-11-22-calendrier-carte-demandes-recues) : le nom du membre, le
    // statut, le type et les dates, la date.
    // Le nom du membre sans lien (décision 2026-11-22-calendrier-membre-sans-lien).
    expect(screen.getByTestId('calendar-title-9')).toHaveTextContent('Marie Curie');
    expect(screen.queryByTestId('calendar-title-link-9')).toBeNull();
    expect(screen.getByText('En attente')).toBeTruthy();
    expect(screen.getByText('Séjour · du 3 déc. 2026 au 6 déc. 2026')).toBeTruthy();
    expect(screen.getByTestId('calendar-date-9')).toBeTruthy();
    // Deux par ligne, à parts égales, le premier à droite (décisions 2026-11-22-calendrier-deux-boutons-par-ligne et
    // 2026-11-22-calendrier-premier-bouton-a-droite).
    expect(StyleSheet.flatten(screen.getByTestId('calendar-action-9-buttons').props.style)).toMatchObject({ flexDirection: 'row-reverse', flexWrap: 'wrap' });
    expect(StyleSheet.flatten(screen.getByTestId('calendar-action-9-primary').props.style)).toMatchObject({ flexGrow: 1, flexBasis: '40%' });
    expect(StyleSheet.flatten(screen.getByTestId('calendar-action-9-buttons').props.style)).toMatchObject({ marginTop: 16 });
    expect(screen.getByTestId('calendar-action-9-primary')).toBeTruthy();
    // Sous la date, la carte en colonne (décision 2026-11-22-calendrier-boutons-sous-la-date).
    expect(StyleSheet.flatten(screen.getByTestId('calendar-row-9').props.style)).toMatchObject({ flexDirection: 'column' });
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"testID":"calendar-date-9"')).toBeLessThan(json.indexOf('"testID":"calendar-action-9-buttons"'));
    expect(screen.getByTestId('calendar-action-9-destructive')).toBeTruthy();

    await fireEvent.press(screen.getByText('Bloquer ce jour'));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ method: 'PUT', endpoint: '/v1/offers/7/blocked-dates/2026-12-03' }), {}));
    expect(await screen.findByText('Jour bloqué.')).toBeTruthy();
  });

  it('le refus du serveur s’affiche dans le panneau', async () => {
    jest.spyOn(profileFormService, 'submit').mockRejectedValue(new ApiError(422, 'Invalid', { date: ['Un séjour accepté occupe ce jour.'] }));
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await show();

    await fireEvent.press(await screen.findByTestId('offer-calendar-day-2026-12-03'));
    await fireEvent.press(await screen.findByText('Bloquer ce jour'));

    expect(await screen.findByText('Un séjour accepté occupe ce jour.')).toBeTruthy();
  });

  it('s’ouvre sur le mois demandé (« Traiter la demande » d’une notification)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <QueryClientProvider client={client}>
        <I18nContext.Provider value={TEST_I18N}>
          <OfferCalendarScreen id="7" month="2026-12" />
        </I18nContext.Provider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(offerService.calendar).toHaveBeenCalledWith('7', '2026-12'));
  });
});
