import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import type { ApiClient } from '@/shared/api/ApiClient';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { OfferDetailScreen } from '../screens/OfferDetailScreen';
import { OfferService } from '../services/OfferService';
import type { OfferDetail, OfferSection } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn() , useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
let mockUser: { id: number } | null = null;
jest.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));
const mockSubmit = jest.fn().mockResolvedValue({ kind: 'done' });
jest.mock('@/features/auth/services/ProfileFormService', () => ({
  ...jest.requireActual('@/features/auth/services/ProfileFormService'),
  profileFormService: { submit: (...args: unknown[]) => mockSubmit(...args) },
}));
jest.mock('expo-image', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { Image: View };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }) };
});

let mockState: { data?: OfferDetail; isPending: boolean; error: unknown } = { isPending: true, error: null };
const mockRefetch = jest.fn();
jest.mock('../hooks/useOfferDetail', () => ({
  useOfferDetail: () => ({ ...mockState, data: mockState.data && mockWithSections(mockState.data), refetch: mockRefetch }),
}));

/**
 * Les sections que Laravel sert par défaut, complètes (décision
 * 2026-11-19-sections-construites-laravel) : localisation ouverte, puis
 * caractéristiques, règles, avis, et un bloc par information ; sauf si le test les donne.
 */
function mockWithSections(offer: OfferDetail): OfferDetail {
  if (offer.sections) {
    return offer;
  }
  const sections: OfferSection[] = [
    ...(offer.address ? [{ key: 'location', type: 'text', title: 'Localisation', open: true, text: offer.address, note: offer.indication ?? null }] : []),
    ...(offer.facts.length > 0 ? [{ key: 'facts', type: 'rows', title: 'Caractéristiques', open: false, rows: offer.facts }] : []),
    ...((offer.rules?.length ?? 0) > 0 ? [{ key: 'rules', type: 'rows', title: 'Règles', open: false, rows: offer.rules }] : []),
    ...(offer.reviews ? [{ key: 'reviews', type: 'reviews', title: 'Avis', open: false }] : []),
    ...(offer.informations ?? []).map((information) => ({ key: `information-${information.id}`, type: 'text', title: information.title, open: false, text: information.description, note: null })),
  ];
  if (sections.length > 0 && !sections.some((section) => section.open)) {
    sections[0].open = true;
  }

  return { ...offer, sections };
}

const OFFER: OfferDetail = {
  id: '7',
  title: 'Appartement 3 pièces à Bonapriso',
  price: { label: 'Loyer mensuel', value: '250 000 FCFA' },
  location: 'Douala',
  photos: ['http://api.test/storage/7-0.jpg', 'http://api.test/storage/7-1.jpg'],
  description: 'Proche des commerces.',
  facts: [
    { label: 'Type de logement', value: 'Appartement' },
    { label: 'Surface', value: '85 m²' },
    { label: 'Équipements', value: 'Wifi, Parking, Gardien / sécurité, Climatisation, Eau chaude' },
  ],
  published_at: '2026-11-18T10:00:00+00:00',
  status: null,
  reviews: {
    average: 4.5,
    count: 2,
    latest: [
      { id: '2', author: 'Paul', rating: 5, comment: 'Propre et calme.', created_at: '2026-11-19T09:00:00+00:00' },
      { id: '1', author: 'Awa', rating: 4, comment: 'Très bon accueil.', created_at: '2026-11-18T09:00:00+00:00' },
    ],
    mine: null,
    can_review: false,
    delete: null,
  },
};

const DELETE = {
  label: 'Supprimer mon avis',
  confirm: 'Supprimer votre avis sur cette offre ?',
  method: 'DELETE',
  endpoint: '/v1/offers/7/review',
  destructive: true,
  success: { action: 'back', message: 'Votre avis est supprimé.' },
};

async function show() {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
      <I18nContext.Provider value={TEST_I18N}>
        <OfferDetailScreen id="7" />
      </I18nContext.Provider>
    </QueryClientProvider>,
  );
}

/** Ouvre les sections repliées (seule la première est ouverte à l'arrivée). */
async function openSections() {
  for (const block of ['offer-section-location', 'offer-section-facts', 'offer-section-rules', 'offer-section-reviews']) {
    const toggle = screen.queryByTestId(`${block}-toggle`);
    if (toggle && !toggle.props.accessibilityState?.expanded) {
      await fireEvent.press(toggle);
    }
  }
}

describe('OfferDetailScreen (fiche décrite par l’API)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { data: OFFER, isPending: false, error: null };
    mockUser = null;
  });

  it('montre photos, titre, prix (sans libellé), description, caractéristiques et date', async () => {
    await show();

    expect(screen.getByTestId('offer-photo-0').props.source).toEqual({ uri: 'http://api.test/storage/7-0.jpg' });
    expect(screen.getByTestId('offer-photo-position').props.children).toBe('1 / 2');
    expect(screen.getByTestId('offer-title').props.children).toBe('Appartement 3 pièces à Bonapriso');
    expect(screen.getByTestId('offer-price').props.children).toBe('250 000 FCFA');
    // Le prix seul ; la ville est dans les caractéristiques (décision 2026-11-19-fiche-offre-ordre).
    expect(screen.queryByText('Loyer mensuel')).toBeNull();
    expect(screen.queryByTestId('offer-location')).toBeNull();
    expect(screen.getAllByTestId('offer-facts-row')).toHaveLength(3);
    // Le libellé d'une valeur longue reste affiché (décision 2026-11-19-fiche-description-equipements).
    expect(screen.getByText('Équipements')).toBeTruthy();
    expect(screen.getByText('85 m²')).toBeTruthy();
    expect(screen.getByTestId('offer-description').props.children).toBe('Proche des commerces.');
    // Sans titre « Description » (décision 2026-11-19-fiche-description-equipements).
    expect(screen.queryByText('Description')).toBeNull();
    expect(screen.getByTestId('offer-published').props.children).toMatch(/^Publiée le /);
    expect(screen.queryByTestId('offer-status')).toBeNull();
  });

  it('description, localisation (adresse complète et indication), puis caractéristiques ; le prix dans la barre fixe', async () => {
    mockState = { data: { ...OFFER, address: 'Rue Njo-Njo 12, Douala, Cameroun', indication: 'Derrière le marché, portail bleu' }, isPending: false, error: null };
    await show();
    // Décision 2026-11-19-fiche-localisation.
    expect(screen.getByText('Localisation')).toBeTruthy();
    expect(screen.getByTestId('offer-location-text').props.children).toBe('Rue Njo-Njo 12, Douala, Cameroun');
    expect(screen.getByTestId('offer-location-note').props.children).toBe('Derrière le marché, portail bleu');
    await openSections();
    // Le prix n'est plus sous le titre : il est dans la barre fixe (décision 2026-11-19-contrat-reservations).
    expect(within(screen.getByTestId('offer-booking-bar')).getByTestId('offer-price')).toBeTruthy();
    expect(within(screen.getByTestId('offer-detail')).queryByTestId('offer-price')).toBeNull();
    const order = ['offer-description', 'offer-location-text', 'offer-location-note', 'offer-facts-row'].map((id) => JSON.stringify(screen.toJSON()).indexOf(`"testID":"${id}"`));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    // Seule la première section est ouverte à l'arrivée (décision 2026-11-19-premiere-section-ouverte).
    await show();
    expect(screen.getByTestId('offer-section-location-toggle').props.accessibilityState).toEqual({ expanded: true });
    for (const block of ['offer-section-facts', 'offer-section-reviews']) {
      expect(screen.getByTestId(`${block}-toggle`).props.accessibilityState).toEqual({ expanded: false });
    }
    expect(screen.queryAllByTestId('offer-facts-row')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('offer-section-facts-toggle'));
    expect(screen.getAllByTestId('offer-facts-row').length).toBeGreaterThan(0);
    expect(screen.getByTestId('offer-location-text')).toBeTruthy();

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
    // Sans adresse : pas de bloc.
    expect(screen.queryByTestId('offer-section-location')).toBeNull();
    // La première section affichée est alors « Caractéristiques » : c'est elle qui est ouverte.
    expect(screen.getByTestId('offer-section-facts-toggle').props.accessibilityState).toEqual({ expanded: true });
  });

  it('les sections suivent l’ordre et l’ouverture servis par Laravel ; un type inconnu est ignoré', async () => {
    // Décisions 2026-11-19-sections-fiche-laravel et 2026-11-19-sections-construites-laravel.
    mockState = {
      data: {
        ...OFFER,
        address: 'Rue Njo-Njo 12, Douala, Cameroun',
        sections: [
          { key: 'reviews', type: 'reviews', title: 'Avis', open: true },
          { key: 'weather', type: 'weather', title: 'Météo', open: true },
          { key: 'facts', type: 'rows', title: 'Caractéristiques', open: false, rows: OFFER.facts },
        ],
      },
      isPending: false,
      error: null,
    };
    await show();

    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"testID":"offer-section-reviews"')).toBeLessThan(json.indexOf('"testID":"offer-section-facts"'));
    expect(screen.getByTestId('offer-section-reviews-toggle').props.accessibilityState).toEqual({ expanded: true });
    expect(screen.getByTestId('offer-section-facts-toggle').props.accessibilityState).toEqual({ expanded: false });
    // Pas servie : pas affichée, même avec une adresse.
    expect(screen.queryByTestId('offer-section-location')).toBeNull();
  });

  it('règles dans leur section ; rien sans valeur', async () => {
    // Décision 2026-11-19-contrat-regles-informations.
    mockState = {
      data: { ...OFFER, rules: [{ label: 'Arrivée à partir de', value: '15:00' }, { label: 'Animaux acceptés', value: 'Non' }] },
      isPending: false,
      error: null,
    };
    await show();
    await openSections();
    expect(screen.getByText('Règles')).toBeTruthy();
    expect(screen.getAllByTestId('offer-rules-row')).toHaveLength(2);
    expect(screen.getByText('15:00')).toBeTruthy();
    // Après les caractéristiques.
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"testID":"offer-facts-row"')).toBeLessThan(json.indexOf('"testID":"offer-rules-row"'));

    mockState = { data: { ...OFFER, rules: [] }, isPending: false, error: null };
    await show();
    expect(screen.queryByTestId('offer-section-rules')).toBeNull();
  });

  it('un bloc d’informations par section, titrée par son titre, après les avis', async () => {
    // Décision 2026-11-19-contrat-offer-informations.
    mockState = {
      data: { ...OFFER, informations: [{ id: '4', title: 'Arrivée', description: 'Clés chez le gardien.\nAppeler la veille.' }, { id: '9', title: 'Parking', description: 'Dans la cour.' }] },
      isPending: false,
      error: null,
    };
    await show();

    expect(screen.getByText('Arrivée')).toBeTruthy();
    expect(screen.getByText('Parking')).toBeTruthy();
    // Fermées à l'arrivée : la description s'ouvre avec la section.
    expect(screen.queryAllByTestId('offer-information-4-text')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('offer-section-information-4-toggle'));
    expect(screen.getByTestId('offer-information-4-text').props.children).toBe('Clés chez le gardien.\nAppeler la veille.');
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('"testID":"offer-section-reviews"')).toBeLessThan(json.indexOf('"testID":"offer-section-information-4"'));
    expect(json.indexOf('"testID":"offer-section-information-4"')).toBeLessThan(json.indexOf('"testID":"offer-section-information-9"'));
  });

  it('le carrousel suit la photo affichée', async () => {
    await show();

    await fireEvent(screen.getByTestId('offer-photos'), 'onMomentumScrollEnd', { nativeEvent: { contentOffset: { x: 10000 } } });

    expect(screen.getByTestId('offer-photo-position').props.children).toBe('2 / 2');
  });

  it('sans photo : un emplacement neutre ; le propriétaire voit le statut', async () => {
    mockState = { data: { ...OFFER, photos: [], status: { value: 'draft', label: 'Brouillon' } }, isPending: false, error: null };
    await show();

    expect(screen.getByTestId('offer-photos-empty')).toBeTruthy();
    expect(screen.getByTestId('offer-status').props.children).toBe('Brouillon');
  });

  it('introuvable : le message, sans réessayer', async () => {
    mockState = { isPending: false, error: new ApiError(404, 'Not found') };
    await show();

    expect(screen.getByTestId('offer-unavailable').props.children).toBe("Cette offre n'est plus disponible.");
    expect(screen.queryByTestId('offer-retry')).toBeNull();
  });
});

describe('OfferDetailScreen : avis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { data: OFFER, isPending: false, error: null };
    mockUser = null;
  });

  it('visiteur : moyenne, nombre, derniers avis, et l’invitation à se connecter', async () => {
    await show();
    await openSections();

    expect(screen.getByTestId('offer-reviews-summary').props.accessibilityLabel).toBe('Note moyenne 4,5 sur 5, 2 avis');
    expect(screen.getAllByTestId('offer-review')).toHaveLength(2);
    expect(screen.getByText('Paul')).toBeTruthy();
    expect(screen.getByText('Propre et calme.')).toBeTruthy();
    expect(screen.getByTestId('offer-reviews-sign-in').props.children).toBe('Connectez-vous pour donner votre avis.');
    expect(screen.queryByTestId('offer-review-write')).toBeNull();
  });

  it('plus d’avis que ceux servis : « Voir tous les avis » ouvre la liste complète ; sinon, pas de bouton', async () => {
    // Décision 2026-11-19-contrat-paiement-visibilite-avis : le nombre servi vient de Laravel.
    await show();
    await openSections();
    expect(screen.queryByTestId('offer-reviews-all')).toBeNull();

    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, latest: OFFER.reviews!.latest.slice(0, 1) } }, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.getAllByTestId('offer-review')).toHaveLength(1);

    expect(screen.getByText('Voir tous les avis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-reviews-all'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/reviews', params: { id: OFFER.id } });
  });

  it('un cœur sur la photo quand l’API en sert un ; aucun sinon', async () => {
    mockState = { data: { ...OFFER, favorite: { active: false, endpoint: '/v1/offers/7/favorite' } }, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.getByTestId('offer-favorite').props.accessibilityLabel).toBe('Ajouter aux favoris');

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.queryByTestId('offer-favorite')).toBeNull();
  });

  it('sans avis : le texte d’attente ; offre non publiée : pas de section', async () => {
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, average: null, count: 0, latest: [] } }, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.getByTestId('offer-reviews-empty').props.children).toBe('Aucun avis pour le moment.');

    mockState = { data: { ...OFFER, reviews: null }, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.queryByTestId('offer-reviews')).toBeNull();
  });

  it('membre : « Donner mon avis » ouvre le formulaire de l’offre ; le propriétaire n’a pas de bouton', async () => {
    mockUser = { id: 3 };
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, can_review: true } }, isPending: false, error: null };
    await show();
    await openSections();

    expect(screen.getByText('Donner mon avis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-review-write'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/review', params: { id: '7' } });

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.queryByTestId('offer-review-write')).toBeNull();
    expect(screen.queryByTestId('offer-reviews-sign-in')).toBeNull();
  });

  it('avec son avis : « Modifier mon avis », et le retirer après confirmation', async () => {
    mockUser = { id: 3 };
    mockState = {
      data: { ...OFFER, reviews: { ...OFFER.reviews!, can_review: true, mine: { rating: 4, comment: 'Très bon accueil.' }, delete: DELETE } },
      isPending: false,
      error: null,
    };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await show();
    await openSections();

    expect(screen.getByText('Modifier mon avis')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('offer-review-delete'));
    });

    expect(alert).toHaveBeenCalledWith('Supprimer votre avis sur cette offre ?', undefined, expect.any(Array));
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', endpoint: '/v1/offers/7/review' }), {});
    expect(screen.getByTestId('offer-notice').props.children).toBe('Votre avis est supprimé.');
    expect(mockRefetch).toHaveBeenCalled();
  });
});

describe('OfferService.get', () => {
  it('demande la fiche par son identifiant', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: OFFER }) };

    await expect(new OfferService(client as unknown as ApiClient).get('7')).resolves.toBe(OFFER);
    expect(client.get).toHaveBeenCalledWith('/v1/offers/7');
  });
});

describe('OfferDetailScreen : barre de réservation (décision 2026-11-19-contrat-reservations)', () => {
  afterEach(() => {
    mockUser = null;
    jest.mocked(router.push).mockClear();
  });

  it('un visiteur passe par la connexion ; un membre ouvre le formulaire lié à l’offre', async () => {
    mockState = { data: { ...OFFER, booking: { type: 'stay', label: 'Réserver', form: 'offer.booking' } }, isPending: false, error: null };
    mockUser = null;
    await show();
    const bar = screen.getByTestId('offer-booking-bar');
    expect(within(bar).getByText('250 000 FCFA')).toBeTruthy();
    await fireEvent.press(within(bar).getByText('Réserver'));
    expect(router.push).toHaveBeenCalledWith('/sign-in');

    mockUser = { id: 3 };
    await show();
    await fireEvent.press(screen.getByTestId('offer-booking'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/offers/[id]/book', params: { id: OFFER.id } });
  });

  it('sa propre offre : le prix seul, sans bouton', async () => {
    mockState = { data: { ...OFFER, booking: null }, isPending: false, error: null };
    await show();
    expect(within(screen.getByTestId('offer-booking-bar')).getByTestId('offer-price')).toBeTruthy();
    expect(screen.queryByTestId('offer-booking')).toBeNull();
    // Au milieu de la barre.
    expect(StyleSheet.flatten(screen.getByTestId('offer-booking-price').props.style)).toMatchObject({ alignItems: 'center' });
  });
});
