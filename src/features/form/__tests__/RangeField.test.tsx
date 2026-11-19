import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { FormField } from '../components/FormField';
import type { FormFieldDefinition } from '../types';
import { initialValue } from '../utils/values';

// Le champ texte peut appeler l'API (suggestions) : son adresse de test.
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { name: 'price', type: 'range', label: 'Loyer', placeholder: null, help: null, required: false, default: null, options: [], suffix: 'FCFA', ...overrides };
}

describe('RangeField (type « range »)', () => {
  it('deux saisies, Min et Max, sous un libellé ; l’unité dans l’aide ; la valeur est [min, max]', async () => {
    const onChange = jest.fn();
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <FormField field={field()} value={['1000', '']} onChange={onChange} />
      </I18nContext.Provider>,
    );

    expect(screen.getByTestId('field-price-min').props.value).toBe('1000');
    expect(screen.getByTestId('field-price-max').props.placeholder).toBe('Max');
    expect(screen.getByTestId('price-help').props.children).toBe('En FCFA');
    await fireEvent.changeText(screen.getByTestId('field-price-max'), '5000');

    expect(onChange).toHaveBeenCalledWith(['1000', '5000']);
  });

  it('valeur de départ : deux bornes vides, ou celles servies', () => {
    expect(initialValue(field())).toEqual(['', '']);
    expect(initialValue(field({ default: [null, 900] }))).toEqual(['', '900']);
  });
});
