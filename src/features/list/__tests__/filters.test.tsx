import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormFieldDefinition } from '@/features/form/types';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import type { ApiClient } from '@/shared/api/ApiClient';

import { FilterScreen } from '../screens/FilterScreen';
import { ListService } from '../services/ListService';
import { activeFilterCount, activeValues, clearFilters, resetFilters, setFilterFields, setFilterValues, useListFilters } from '../utils/filters';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } , useRootNavigationState: () => undefined, useNavigationContainerRef: () => ({ getRootState: () => undefined, dispatch: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

const FIELDS: FormFieldDefinition[] = [
  field({ name: 'city', type: 'select', options: [{ value: 'Douala', label: 'Douala' }] }),
  field({ name: 'price', type: 'range', suffix: 'FCFA' }),
  field({ name: 'furnished', type: 'segmented', default: 'any', options: [{ value: 'any', label: 'Tous' }, { value: 'true', label: 'Meublé' }] }),
  field({ name: 'property_type', type: 'multiselect', options: [{ value: 'studio', label: 'Studio' }, { value: 'house', label: 'Maison' }] }),
];

describe('filtres d’une liste (décision 2026-11-19-contrat-filtres-vitrine)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFilters();
  });

  it('le badge compte les filtres actifs ; un intervalle compte pour un ; « Tous » et les vides ne comptent pas', () => {
    const values = { city: 'Douala', price: ['1000', '9000'], furnished: 'any', property_type: [] as string[] };

    expect(activeFilterCount(FIELDS, values)).toBe(2);
    expect(activeValues(FIELDS, values)).toEqual({ city: 'Douala', price: ['1000', '9000'] });
    expect(activeFilterCount(FIELDS, { ...values, furnished: 'true', property_type: ['studio'] })).toBe(4);
    expect(activeFilterCount(FIELDS, { price: ['', ''] })).toBe(0);
    expect(activeFilterCount(FIELDS, { price: ['', '5000'] })).toBe(1);
    expect(activeFilterCount(FIELDS, {})).toBe(0);
  });

  it('les filtres partent dans l’URL : une valeur, ou plusieurs pour des cases', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: {} }) };

    await new ListService(client as unknown as ApiClient).get('offer.browse', null, 'akwa', { city: 'Douala', property_type: ['studio', 'house'] });

    // Crochets encodés : une adresse valide, qu'iOS ne réencode pas.
    expect(client.get).toHaveBeenCalledWith(
      '/v1/lists/offer.browse?search=akwa&filter%5Bcity%5D=Douala&filter%5Bproperty_type%5D%5B%5D=studio&filter%5Bproperty_type%5D%5B%5D=house',
    );
  });

  it('une ville accentuée part encodée une seule fois, dans une adresse valide', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: {} }) };

    await new ListService(client as unknown as ApiClient).get('offer.browse', null, '', { city: 'Yaoundé' });

    const url = client.get.mock.calls[0][0] as string;
    expect(url).toBe('/v1/lists/offer.browse?filter%5Bcity%5D=Yaound%C3%A9');
    // Rien qu'iOS aurait à réencoder (il réencoderait aussi les « % » déjà là).
    expect(url).toBe(encodeURI(decodeURI(url)));
  });

  it('l’écran des filtres : barre fixe en bas ; il applique les choix, ou les efface, puis revient', async () => {
    setFilterFields('offer.browse', FIELDS);
    setFilterValues('offer.browse', { city: 'Douala' });
    const seen: { values: Record<string, unknown> }[] = [];
    function Probe() {
      seen.push(useListFilters('offer.browse'));

      return null;
    }

    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="offer.browse" />
        <Probe />
      </I18nContext.Provider>,
    );

    // Prérempli avec les filtres en cours.
    expect(screen.getByTestId('field-city')).toBeTruthy();
    // Un intervalle à l'envers : erreur sous le champ, rien n'est appliqué.
    await fireEvent.changeText(screen.getByTestId('field-price-min'), '100000');
    await fireEvent.changeText(screen.getByTestId('field-price-max'), '50000');
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-apply'));
    });
    expect(screen.getByTestId('price-error')).toHaveTextContent('Le maximum doit être au moins égal au minimum.');
    expect(router.back).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('field-price-min'), '');

    // Les boutons sont hors de la partie qui défile.
    expect(screen.getByTestId('filter-bar')).toBeTruthy();
    expect(screen.getAllByTestId(/^(filter-screen|filter-bar)$/).map((node) => node.props.testID)).toEqual(['filter-screen', 'filter-bar']);
    await fireEvent.changeText(screen.getByTestId('field-price-max'), '90000');
    await fireEvent.press(screen.getByTestId('field-property_type'));
    await fireEvent.press(screen.getByTestId('field-property_type-option-house'));
    await fireEvent.press(screen.getByTestId('field-property_type-option-studio'));
    await fireEvent.press(screen.getByTestId('field-property_type-confirm'));
    expect(screen.getByTestId('field-property_type')).toHaveTextContent('Studio, Maison');
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-apply'));
    });

    expect(seen[seen.length - 1].values).toEqual({ city: 'Douala', price: ['', '90000'], property_type: ['studio', 'house'] });
    expect(router.back).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-clear'));
    });
    expect(seen[seen.length - 1].values).toEqual({});
  });

  it('un filtre conditionnel ne s’affiche ni ne s’applique sans sa condition ; une liste à rechercher montre 10 options au plus', async () => {
    const offers = Array.from({ length: 15 }, (_, index) => ({ value: String(index + 1), label: `Logement ${index + 1}` }));
    setFilterFields('notifications', [
      field({ name: 'type', type: 'select', options: [{ value: 'booking', label: 'Demande de logement' }, { value: 'other', label: 'Autre' }] }),
      field({ name: 'offer', type: 'select', options: offers, searchable: true, visible_when: { field: 'type', value: 'booking', values: ['booking'] } }),
    ]);
    const seen: { values: Record<string, unknown> }[] = [];
    function Probe() {
      seen.push(useListFilters('notifications'));

      return null;
    }

    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="notifications" />
        <Probe />
      </I18nContext.Provider>,
    );

    expect(screen.queryByTestId('field-offer')).toBeNull();
    // Chaque liste commence par « Tous », choisi au départ.
    expect(screen.getByTestId('field-type')).toHaveTextContent('Tous');
    await fireEvent.press(screen.getByTestId('field-type'));
    expect(screen.getAllByText('Tous').length).toBeGreaterThanOrEqual(2);
    await fireEvent.press(screen.getByTestId('field-type-option-booking'));
    // Le type choisi : « Logement » apparaît ; sa liste montre 10 options, la recherche trouve les autres.
    await fireEvent.press(screen.getByTestId('field-offer'));
    expect(screen.getAllByTestId(/^field-offer-option-/)).toHaveLength(10);
    await fireEvent.changeText(screen.getByTestId('field-offer-search'), 'Logement 15');
    await fireEvent.press(screen.getByTestId('field-offer-option-15'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-apply'));
    });
    expect(seen[seen.length - 1].values).toEqual({ type: 'booking', offer: '15' });

    // Un autre type : « Logement » disparaît et n'est plus appliqué.
    setFilterValues('notifications', {});
    await fireEvent.press(screen.getByTestId('field-type'));
    await fireEvent.press(screen.getByTestId('field-type-option-other'));
    expect(screen.queryByTestId('field-offer')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-apply'));
    });
    expect(seen[seen.length - 1].values).toEqual({ type: 'other' });
  });

  it('un filtre caché filtre sans s’afficher, ne compte pas et reste après « Réinitialiser » (décision 2026-11-21-demandes-filtre-logement-cache)', async () => {
    const fields = [field({ name: 'status', type: 'select', options: [{ value: 'pending', label: 'En attente' }] }), field({ name: 'offer', type: 'hidden' })];
    setFilterFields('offer.bookings.received', fields);
    setFilterValues('offer.bookings.received', { offer: '7' });
    expect(activeFilterCount(fields, { offer: '7' })).toBe(0);
    expect(activeFilterCount(fields, { offer: '7', status: 'pending' })).toBe(1);
    const seen: { values: Record<string, unknown> }[] = [];
    function Probe() {
      seen.push(useListFilters('offer.bookings.received'));

      return null;
    }

    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="offer.bookings.received" />
        <Probe />
      </I18nContext.Provider>,
    );

    expect(screen.getByTestId('field-status')).toBeTruthy();
    expect(screen.queryByTestId('field-offer')).toBeNull();
    await fireEvent.press(screen.getByTestId('field-status'));
    await fireEvent.press(screen.getByTestId('field-status-option-pending'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-apply'));
    });
    expect(seen[seen.length - 1].values).toEqual({ offer: '7', status: 'pending' });
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-clear'));
    });
    expect(seen[seen.length - 1].values).toEqual({ offer: '7' });
  });

  it('enlever les filtres d’une liste garde ses champs et ne touche pas les autres (décision 2026-11-21-onglet-notifications-sans-filtres)', async () => {
    setFilterFields('notifications', FIELDS);
    setFilterValues('notifications', { city: 'Douala', furnished: 'true' });
    setFilterFields('offers', FIELDS);
    setFilterValues('offers', { city: 'Douala' });

    clearFilters('notifications');

    const { result } = await renderHook(() => useListFilters('notifications'));
    expect(result.current.values).toEqual({});
    expect(result.current.fields).toEqual(FIELDS);
    expect((await renderHook(() => useListFilters('offers'))).result.current.values).toEqual({ city: 'Douala' });
  });
});

describe('filtre « Statut » selon le type (décision 2026-11-24-notifications-types-reservation-partenaire)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFilters();
  });

  it('un filtre sans « Tous » ne le propose pas ; la ville le garde (décision 2026-11-25-region-sans-tous)', async () => {
    setFilterFields('offer.browse', [
      field({ name: 'region', type: 'select', all_option: false, options: [{ value: '27', label: 'Centre' }, { value: '34', label: 'Littoral' }] }),
      field({ name: 'city', type: 'select', options: [{ value: 'Douala', label: 'Douala' }] }),
    ]);
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="offer.browse" />
      </I18nContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId('field-region'));
    expect(screen.queryByTestId('field-region-option-')).toBeNull();
    expect(screen.getByTestId('field-region-option-34')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('field-region-option-34'));

    await fireEvent.press(screen.getByTestId('field-city'));
    expect(screen.getByTestId('field-city-option-')).toBeTruthy();
  });

  it('un filtre obligatoire ne se choisit pas dans l’écran des filtres, reste appliqué et effacer le garde (décisions 2026-11-25-region-obligatoire-recherche et 2026-11-25-region-en-tete-recherche)', async () => {
    const fields = [
      field({ name: 'region', type: 'select', required: true, default: '27', all_option: false, options: [{ value: '27', label: 'Centre' }, { value: '34', label: 'Littoral' }] }),
      field({ name: 'city', type: 'select', options: [{ value: 'Douala', label: 'Douala' }] }),
    ];
    setFilterFields('offer.browse', fields);
    setFilterValues('offer.browse', { region: '34' });
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="offer.browse" />
      </I18nContext.Provider>,
    );

    // La région se choisit en tête de la recherche, pas ici.
    expect(screen.queryByTestId('field-region')).toBeNull();
    await fireEvent.press(screen.getByTestId('field-city'));
    await fireEvent.press(screen.getByTestId('field-city-option-Douala'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-apply'));
    });
    const { result } = await renderHook(() => useListFilters('offer.browse'));
    expect(result.current.values).toEqual({ region: '34', city: 'Douala' });
    // Le badge ne compte pas la région.
    expect(activeFilterCount(fields, result.current.values)).toBe(1);

    // Effacer garde la région choisie et retire la ville.
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="offer.browse" />
      </I18nContext.Provider>,
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId('filter-clear'));
    });
    expect(result.current.values).toEqual({ region: '34' });
  });

  it('le statut ne propose que ceux du type choisi', async () => {
    const types = [
      { value: 'booking', label: 'Réservation' },
      { value: 'partner', label: 'Partenaire' },
    ];
    const statuses = [
      { value: 'accepted', label: 'Acceptée', parent: 'booking' },
      { value: 'partner_published', label: 'Publié', parent: 'partner' },
    ];
    setFilterFields('notifications', [
      field({ name: 'type', type: 'select', options: types }),
      field({ name: 'status', type: 'select', options: statuses, depends_on: 'type', visible_when: { field: 'type', value: 'booking', values: ['booking', 'partner'] } }),
    ]);

    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FilterScreen list="notifications" />
      </I18nContext.Provider>,
    );

    // Réservation : les statuts d'une demande.
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-type'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-type-option-booking'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-status'));
    });
    expect(screen.getByTestId('field-status-option-accepted')).toBeTruthy();
    expect(screen.queryByTestId('field-status-option-partner_published')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-status-option-accepted'));
    });

    // Partenaire : ses statuts seulement.
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-type'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-type-option-partner'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('field-status'));
    });
    expect(screen.getByTestId('field-status-option-partner_published')).toBeTruthy();
    expect(screen.queryByTestId('field-status-option-accepted')).toBeNull();
  });
});
