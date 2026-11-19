import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import type { ApiClient } from '@/shared/api/ApiClient';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { OfferDetailScreen } from '../screens/OfferDetailScreen';
import { OfferService } from '../services/OfferService';
import type { OfferDetail } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true }, useFocusEffect: jest.fn() }));
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

  return { SafeAreaView: View };
});

let mockState: { data?: OfferDetail; isPending: boolean; error: unknown } = { isPending: true, error: null };
const mockRefetch = jest.fn();
jest.mock('../hooks/useOfferDetail', () => ({
  useOfferDetail: () => ({ ...mockState, refetch: mockRefetch }),
}));

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
    expect(screen.getAllByTestId('offer-fact')).toHaveLength(2);
    expect(screen.getByText('85 m²')).toBeTruthy();
    expect(screen.getByTestId('offer-description').props.children).toBe('Proche des commerces.');
    expect(screen.getByTestId('offer-published').props.children).toMatch(/^Publiée le /);
    expect(screen.queryByTestId('offer-status')).toBeNull();
  });

  it('prix, description, adresse (les indications du propriétaire), puis caractéristiques', async () => {
    mockState = { data: { ...OFFER, address_description: 'Derrière le marché, portail bleu' }, isPending: false, error: null };
    await show();
    expect(screen.getByTestId('offer-address-description').props.children).toBe('Derrière le marché, portail bleu');
    expect(screen.getByText('Adresse')).toBeTruthy();
    const order = ['offer-price', 'offer-description', 'offer-address-description', 'offer-fact'].map((id) => JSON.stringify(screen.toJSON()).indexOf(`"testID":"${id}"`));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
    expect(screen.queryByTestId('offer-address-description')).toBeNull();
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

    expect(screen.getByTestId('offer-reviews-summary').props.accessibilityLabel).toBe('Note moyenne 4,5 sur 5, 2 avis');
    expect(screen.getAllByTestId('offer-review')).toHaveLength(2);
    expect(screen.getByText('Paul')).toBeTruthy();
    expect(screen.getByText('Propre et calme.')).toBeTruthy();
    expect(screen.getByTestId('offer-reviews-sign-in').props.children).toBe('Connectez-vous pour donner votre avis.');
    expect(screen.queryByTestId('offer-review-write')).toBeNull();
  });

  it('plus d’avis que ceux affichés : « Voir les N avis » ouvre la liste complète ; sinon, pas de lien', async () => {
    // Décision 2026-11-19-nuit-tous-les-avis. Deux avis, tous affichés : pas de lien.
    await show();
    expect(screen.queryByTestId('offer-reviews-all')).toBeNull();

    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, count: 12 } }, isPending: false, error: null };
    await show();

    expect(screen.getByText('Voir les 12 avis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-reviews-all'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/reviews', params: { id: OFFER.id } });
  });

  it('un cœur sur la photo quand l’API en sert un ; aucun sinon', async () => {
    mockState = { data: { ...OFFER, favorite: { active: false, endpoint: '/v1/offers/7/favorite' } }, isPending: false, error: null };
    await show();
    expect(screen.getByTestId('offer-favorite').props.accessibilityLabel).toBe('Ajouter aux favoris');

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
    expect(screen.queryByTestId('offer-favorite')).toBeNull();
  });

  it('sans avis : le texte d’attente ; offre non publiée : pas de section', async () => {
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, average: null, count: 0, latest: [] } }, isPending: false, error: null };
    await show();
    expect(screen.getByTestId('offer-reviews-empty').props.children).toBe('Aucun avis pour le moment.');

    mockState = { data: { ...OFFER, reviews: null }, isPending: false, error: null };
    await show();
    expect(screen.queryByTestId('offer-reviews')).toBeNull();
  });

  it('membre : « Donner mon avis » ouvre le formulaire de l’offre ; le propriétaire n’a pas de bouton', async () => {
    mockUser = { id: 3 };
    mockState = { data: { ...OFFER, reviews: { ...OFFER.reviews!, can_review: true } }, isPending: false, error: null };
    await show();

    expect(screen.getByText('Donner mon avis')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('offer-review-write'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/offers/[id]/review', params: { id: '7' } });

    mockState = { data: OFFER, isPending: false, error: null };
    await show();
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
