import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { FormFieldDefinition } from '@/features/form/types';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import type { ApiClient } from '@/shared/api/ApiClient';

import { FilterScreen } from '../screens/FilterScreen';
import { ListService } from '../services/ListService';
import { activeFilterCount, activeValues, resetFilters, setFilterFields, setFilterValues, useListFilters } from '../utils/filters';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View };
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

    expect(client.get).toHaveBeenCalledWith('/v1/lists/offer.browse?search=akwa&filter[city]=Douala&filter[property_type][]=studio&filter[property_type][]=house');
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
});
