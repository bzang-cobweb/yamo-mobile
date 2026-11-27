import { fireEvent, render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { FormField } from '../components/FormField';
import type { FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { name: 'price', type: 'range', label: 'Prix', placeholder: null, help: null, required: false, default: null, options: [], range: { min: 0, max: 500000, step: 10000 }, ...overrides };
}

async function show(value: string[], overrides: Partial<FormFieldDefinition> = {}, onChange = jest.fn()) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <FormField field={field(overrides)} value={value} onChange={onChange} />
    </I18nContext.Provider>,
  );

  return onChange;
}

const action = (name: string) => ({ nativeEvent: { actionName: name } });

describe('Intervalle en curseur (décision 2026-11-27-intervalle-curseur)', () => {
  it('sans bornes servies : les deux saisies, comme avant', async () => {
    await show(['', ''], { range: null });

    expect(screen.getByTestId('field-price-min')).toBeTruthy();
    expect(screen.queryByTestId('field-price-thumb-min')).toBeNull();
  });

  it('avec des bornes : deux poignées ; rien de choisi, toute la plage', async () => {
    await show(['', '']);

    expect(screen.getByTestId('field-price-value')).toHaveTextContent(/^0 – 500\s000$/);
    expect(screen.getByTestId('field-price-thumb-min').props.accessibilityLabel).toBe('Min');
    expect(screen.getByTestId('field-price-thumb-max').props.accessibilityLabel).toBe('Max');
  });

  it('chaque poignée se règle d’un incrément ; revenue au bout, elle ne borne plus rien', async () => {
    const onChange = await show(['', '']);

    await fireEvent(screen.getByTestId('field-price-thumb-min'), 'accessibilityAction', action('increment'));
    expect(onChange).toHaveBeenLastCalledWith(['10000', '']);
    await fireEvent(screen.getByTestId('field-price-thumb-max'), 'accessibilityAction', action('decrement'));
    expect(onChange).toHaveBeenLastCalledWith(['', '490000']);
  });

  it('une poignée ne dépasse pas l’autre', async () => {
    const onChange = await show(['200000', '200000']);

    await fireEvent(screen.getByTestId('field-price-thumb-min'), 'accessibilityAction', action('increment'));
    expect(onChange).toHaveBeenLastCalledWith(['200000', '200000']);
    expect(screen.getByTestId('field-price-value')).toHaveTextContent(/^200\s000 – 200\s000$/);
  });
});
