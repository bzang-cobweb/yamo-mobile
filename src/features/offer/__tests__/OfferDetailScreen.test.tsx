import { fireEvent, render, screen } from '@testing-library/react-native';

import { ApiError } from '@/shared/api/errors';
import type { ApiClient } from '@/shared/api/ApiClient';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { OfferDetailScreen } from '../screens/OfferDetailScreen';
import { OfferService } from '../services/OfferService';
import type { OfferDetail } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));
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
};

async function show() {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <OfferDetailScreen id="7" />
    </I18nContext.Provider>,
  );
}

describe('OfferDetailScreen (fiche décrite par l’API)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = { data: OFFER, isPending: false, error: null };
  });

  it('montre photos, titre, prix, ville, caractéristiques, description et date', async () => {
    await show();

    expect(screen.getByTestId('offer-photo-0').props.source).toEqual({ uri: 'http://api.test/storage/7-0.jpg' });
    expect(screen.getByTestId('offer-photo-position').props.children).toBe('1 / 2');
    expect(screen.getByTestId('offer-title').props.children).toBe('Appartement 3 pièces à Bonapriso');
    expect(screen.getByTestId('offer-price').props.children).toBe('250 000 FCFA');
    expect(screen.getByText('Loyer mensuel')).toBeTruthy();
    expect(screen.getByTestId('offer-location').props.children).toBe('Douala');
    expect(screen.getAllByTestId('offer-fact')).toHaveLength(2);
    expect(screen.getByText('85 m²')).toBeTruthy();
    expect(screen.getByTestId('offer-description').props.children).toBe('Proche des commerces.');
    expect(screen.getByTestId('offer-published').props.children).toMatch(/^Publiée le /);
    expect(screen.queryByTestId('offer-status')).toBeNull();
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

describe('OfferService.get', () => {
  it('demande la fiche par son identifiant', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: OFFER }) };

    await expect(new OfferService(client as unknown as ApiClient).get('7')).resolves.toBe(OFFER);
    expect(client.get).toHaveBeenCalledWith('/v1/offers/7');
  });
});
