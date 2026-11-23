import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, StyleSheet } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import type { ApiClient } from '@/shared/api/ApiClient';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { currentToast } from '@/shared/components/Toast';

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
    // Caractéristiques, description, localisation, puis le reste (décision 2026-11-22-fiche-sections-ordre).
    ...(offer.facts.length > 0 ? [{ key: 'facts', type: 'rows', title: 'Caractéristiques', open: true, rows: offer.facts }] : []),
    ...(offer.description ? [{ key: 'description', type: 'text', title: 'Description', open: false, text: offer.description, note: null }] : []),
    ...(offer.address ? [{ key: 'location', type: 'text', title: 'Localisation', open: false, text: offer.address, note: offer.indication ?? null }] : []),
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
  composed_title: 'Location · Appartement · Douala',
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
  for (const block of ['offer-section-facts', 'offer-section-description', 'offer-section-location', 'offer-section-rules', 'offer-section-reviews']) {
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
    // Le titre composé juste dessous, les deux centrés (décision 2026-11-22-fiche-titres-centres).
    expect(screen.getByTestId('offer-composed-title')).toHaveTextContent('Location · Appartement · Douala');
    expect(StyleSheet.flatten(screen.getByTestId('offer-title').props.style)).toMatchObject({ textAlign: 'center' });
    expect(StyleSheet.flatten(screen.getByTestId('offer-composed-title').props.style)).toMatchObject({ textAlign: 'center' });
    // La note juste dessous, centrée : étoiles, moyenne, nombre d'avis (décision 2026-11-22-fiche-note-sous-titre).
    const rating = screen.getByTestId('offer-title-rating');
    expect(StyleSheet.flatten(rating.props.style)).toMatchObject({ justifyContent: 'center' });
    expect(within(rating).getByText('4,5')).toBeTruthy();
    expect(within(rating).getByText(`(${OFFER.reviews!.count})`)).toBeTruthy();
    expect(screen.getByTestId('offer-price').props.children).toBe('250 000 FCFA');
    // Le prix seul ; la ville est dans les caractéristiques (décision 2026-11-19-fiche-offre-ordre).
    expect(screen.queryByText('Loyer mensuel')).toBeNull();
    expect(screen.queryByTestId('offer-location')).toBeNull();
    expect(screen.getAllByTestId('offer-facts-row')).toHaveLength(3);
    // Le libellé d'une valeur longue reste affiché (décision 2026-11-19-fiche-description-equipements).
    expect(screen.getByText('Équipements')).toBeTruthy();
    expect(screen.getByText('85 m²')).toBeTruthy();
    // Dans sa section « Description », fermée à l'arrivée (décisions 2026-11-22-fiche-sections-ordre et
    // 2026-11-22-fiche-premiere-section-ouverte).
    await openSections();
    expect(screen.getByTestId('offer-description-text').props.children).toBe('Proche des commerces.');
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByTestId('offer-published').props.children).toMatch(/^Publiée le /);
    expect(screen.queryByTestId('offer-status')).toBeNull();
  });

  it('caractéristiques, description, puis localisation (adresse complète et indication) ; le prix dans la barre fixe', async () => {
    mockState = { data: { ...OFFER, address: 'Rue Njo-Njo 12, Douala, Cameroun', indication: 'Derrière le marché, portail bleu' }, isPending: false, error: null };
    await show();
    await openSections();
    // Décision 2026-11-19-fiche-localisation.
    expect(screen.getByText('Localisation')).toBeTruthy();
    expect(screen.getByTestId('offer-location-text').props.children).toBe('Rue Njo-Njo 12, Douala, Cameroun');
    expect(screen.getByTestId('offer-location-note').props.children).toBe('Derrière le marché, portail bleu');
    // Le même texte que les lignes des caractéristiques (décision 2026-11-22-fiche-texte-comme-lignes).
    const size = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) as { fontSize?: number } | undefined)?.fontSize;
    expect(size(screen.getByTestId('offer-location-text'))).toBe(size(screen.getByText('85 m²')));
    await openSections();
    // Le prix n'est plus sous le titre : il est dans la barre fixe (décision 2026-11-19-contrat-reservations).
    expect(within(screen.getByTestId('offer-booking-bar')).getByTestId('offer-price')).toBeTruthy();
    expect(within(screen.getByTestId('offer-detail')).queryByTestId('offer-price')).toBeNull();
    const order = ['offer-facts-row', 'offer-description-text', 'offer-location-text', 'offer-location-note'].map((id) => JSON.stringify(screen.toJSON()).indexOf(`"testID":"${id}"`));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    // À l'arrivée : seule la première section, les caractéristiques, est ouverte, comme servi (décision
    // 2026-11-22-fiche-premiere-section-ouverte).
    await show();
    expect(screen.getByTestId('offer-section-facts-toggle').props.accessibilityState).toEqual({ expanded: true });
    for (const block of ['offer-section-description', 'offer-section-location', 'offer-section-reviews']) {
      expect(screen.getByTestId(`${block}-toggle`).props.accessibilityState).toEqual({ expanded: false });
    }
    expect(screen.getAllByTestId('offer-facts-row').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('offer-location-text')).toBeNull();
    await fireEvent.press(screen.getByTestId('offer-section-location-toggle'));
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
    mockState = { data: { ...OFFER, photos: [], favorite: null, status: { value: 'draft', label: 'Brouillon', tone: 'neutral' } }, isPending: false, error: null };
    await show();

    expect(screen.getByTestId('offer-photos-empty')).toBeTruthy();
    // En pastille sur la photo, à la place du cœur (décision 2026-11-21-statut-a-la-place-du-coeur).
    expect(screen.getByTestId('offer-status')).toHaveTextContent('Brouillon');
    expect(StyleSheet.flatten(screen.getByTestId('offer-status').props.style)).toMatchObject({ position: 'absolute', top: expect.any(Number), right: expect.any(Number) });
    expect(screen.queryByTestId('offer-favorite')).toBeNull();
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

  it('des avis : « Voir tous les avis » ouvre la liste complète, même quand tous sont servis', async () => {
    // Décision 2026-11-20-boutons-avis-fiche.
    await show();
    await openSections();

    expect(screen.getByText('Voir tous les avis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-reviews-all'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/reviews', params: { id: OFFER.id } });
    // Un visiteur n'a aucun bouton d'avis dans la barre.
    expect(screen.queryByTestId('offer-review-bar')).toBeNull();
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
    // Sans avis : pas de note sous les titres.
    expect(screen.queryByTestId('offer-title-rating')).toBeNull();
    await openSections();
    expect(screen.getByTestId('offer-reviews-empty').props.children).toBe('Aucun avis pour le moment.');

    mockState = { data: { ...OFFER, reviews: null }, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.queryByTestId('offer-reviews')).toBeNull();
  });

  it('aucun avis : « Donner mon avis » dans la section', async () => {
    mockUser = { id: 3 };
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, average: null, count: 0, latest: [], can_review: true } }, isPending: false, error: null };
    await show();
    await openSections();

    expect(screen.getByTestId('offer-review-write')).toHaveTextContent('Donner mon avis');
    expect(screen.queryByTestId('offer-reviews-all')).toBeNull();
    expect(screen.queryByTestId('offer-review-bar')).toBeNull();
    await fireEvent.press(screen.getByTestId('offer-review-write'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/review', params: { id: '7' } });
  });

  it('un seul avis, le sien : « Modifier mon avis » dans la section, sans suppression', async () => {
    mockUser = { id: 3 };
    const mine = { rating: 4, comment: 'Très bon accueil.' };
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, count: 1, latest: OFFER.reviews!.latest.slice(1), can_review: true, mine, delete: DELETE } }, isPending: false, error: null };
    await show();
    await openSections();

    expect(screen.getByTestId('offer-review-write')).toHaveTextContent('Modifier mon avis');
    expect(screen.queryByTestId('offer-reviews-all')).toBeNull();
    expect(screen.queryByTestId('offer-review-bar')).toBeNull();
    expect(screen.queryByText('Supprimer mon avis')).toBeNull();
  });

  it('des avis, aucun du membre : « Voir tous les avis » ; « Donner mon avis » dans la barre ; le propriétaire n’a pas de bouton', async () => {
    mockUser = { id: 3 };
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, can_review: true } }, isPending: false, error: null };
    await show();
    await openSections();

    expect(screen.getByTestId('offer-reviews-all')).toBeTruthy();
    expect(screen.queryByTestId('offer-review-write')).toBeNull();
    const bar = screen.getByTestId('offer-review-bar');
    expect(within(bar).getByText('Donner mon avis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-review-bar-write'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/review', params: { id: '7' } });

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
    await openSections();
    expect(screen.queryByTestId('offer-review-bar')).toBeNull();
    expect(screen.queryByTestId('offer-reviews-sign-in')).toBeNull();
  });

  it('plusieurs avis dont le sien : « Voir tous les avis » ; « Modifier » et « Supprimer » dans la barre, après confirmation', async () => {
    mockUser = { id: 3 };
    mockState = {
      data: { ...OFFER, reviews: { ...OFFER.reviews!, can_review: true, mine: { rating: 4, comment: 'Très bon accueil.' }, delete: DELETE } },
      isPending: false,
      error: null,
    };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await show();
    await openSections();

    expect(screen.getByTestId('offer-reviews-all')).toBeTruthy();
    expect(screen.queryByTestId('offer-review-write')).toBeNull();
    expect(screen.queryByTestId('offer-review-delete')).toBeNull();
    expect(screen.getByTestId('offer-review-bar-edit')).toHaveTextContent('Modifier mon avis');
    await act(async () => {
      fireEvent.press(screen.getByTestId('offer-review-bar-delete'));
    });

    expect(alert).toHaveBeenCalledWith('Supprimer votre avis sur cette offre ?', undefined, expect.any(Array));
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', endpoint: '/v1/offers/7/review' }), {});
    // Dans le bandeau flottant (décision 2026-11-21-bandeau-messages).
    expect(currentToast()).toMatchObject({ message: 'Votre avis est supprimé.', tone: 'success' });
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

  it('une longue description : 4 lignes, puis « Voir plus » / « Voir moins » (décision 2026-11-22-description-voir-plus)', async () => {
    await show();
    await openSections();
    const description = screen.getByTestId('offer-description-text');
    expect(screen.queryByTestId('offer-description-text-more')).toBeNull();

    await act(async () => {
      fireEvent(description, 'textLayout', { nativeEvent: { lines: Array.from({ length: 6 }, () => ({})) } });
    });
    expect(screen.getByTestId('offer-description-text').props.numberOfLines).toBe(4);
    expect(screen.getByTestId('offer-description-text-more')).toHaveTextContent('Voir plus');

    await fireEvent.press(screen.getByTestId('offer-description-text-more'));
    expect(screen.getByTestId('offer-description-text').props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId('offer-description-text-more')).toHaveTextContent('Voir moins');
  });

  it('une courte description : pas de « Voir plus »', async () => {
    await show();
    await openSections();
    await act(async () => {
      fireEvent(screen.getByTestId('offer-description-text'), 'textLayout', { nativeEvent: { lines: [{}, {}] } });
    });
    expect(screen.queryByTestId('offer-description-text-more')).toBeNull();
    expect(screen.getByTestId('offer-description-text').props.numberOfLines).toBeUndefined();
  });

  it('sa propre offre : « Modifier » ouvre le formulaire de l’offre (décision 2026-11-19-fiche-bouton-modifier)', async () => {
    mockState = { data: { ...OFFER, booking: null, edit: { label: 'Modifier', form: 'offer.offer' } }, isPending: false, error: null };
    mockUser = { id: 3 };
    await show();
    const bar = screen.getByTestId('offer-booking-bar');
    expect(within(bar).getByTestId('offer-price')).toBeTruthy();
    expect(screen.queryByTestId('offer-booking')).toBeNull();

    await fireEvent.press(within(bar).getByText('Modifier'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'offer.offer', record: OFFER.id } });
  });

  it('sa propre offre : « Retirer » à la place du prix, après confirmation, puis retour (décision 2026-11-22-retirer-depuis-la-fiche)', async () => {
    const remove = { label: 'Retirer', confirm: 'Retirer cette offre ?', method: 'DELETE', endpoint: `/v1/offers/${OFFER.id}`, destructive: true, success: { action: 'back', message: 'Offre retirée.' } };
    mockState = { data: { ...OFFER, booking: null, edit: { label: 'Modifier', form: 'offer.offer' }, delete: remove }, isPending: false, error: null };
    mockUser = { id: 3 };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await show();
    const bar = screen.getByTestId('offer-booking-bar');
    expect(within(bar).queryByTestId('offer-price')).toBeNull();
    expect(within(bar).getByTestId('offer-delete')).toHaveTextContent('Retirer');

    await act(async () => {
      fireEvent.press(within(bar).getByTestId('offer-delete'));
    });
    expect(alert).toHaveBeenCalledWith('Retirer cette offre ?', undefined, expect.any(Array));
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', endpoint: `/v1/offers/${OFFER.id}` }), {});
    expect(router.back).toHaveBeenCalled();
    alert.mockRestore();
  });

  it('ni réservation ni modification : le prix seul', async () => {
    mockState = { data: { ...OFFER, booking: null, edit: null }, isPending: false, error: null };
    await show();
    expect(within(screen.getByTestId('offer-booking-bar')).getByTestId('offer-price')).toBeTruthy();
    expect(screen.queryByTestId('offer-booking')).toBeNull();
    expect(screen.queryByTestId('offer-edit')).toBeNull();
  });
});
