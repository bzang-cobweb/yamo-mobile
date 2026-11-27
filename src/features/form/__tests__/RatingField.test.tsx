import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Colors } from '@/shared/theme/theme';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { FormField } from '../components/FormField';
import type { FormFieldDefinition } from '../types';

// Le champ texte peut appeler l'API (suggestions) : son adresse de test.
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(): FormFieldDefinition {
  return { name: 'rating', type: 'rating', label: 'Note', placeholder: null, help: null, required: true, default: null, options: [] };
}

async function show(value: string, onChange = jest.fn(), overrides: Partial<FormFieldDefinition> = {}) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <FormField field={{ ...field(), ...overrides }} value={value} onChange={onChange} />
    </I18nContext.Provider>,
  );

  return onChange;
}


describe('RatingField (type « rating », décision 2026-11-27-note-au-dixieme)', () => {
  it('sans note : un tiret, les étoiles vides, le curseur au début', async () => {
    await show('');

    expect(screen.getByTestId('field-rating-value')).toHaveTextContent('–');
    expect(StyleSheet.flatten(screen.getByTestId('field-rating-thumb').props.style)).toMatchObject({ opacity: 0.35 });
    expect(screen.getByTestId('field-rating').props.accessibilityRole).toBe('adjustable');
    expect(screen.getByLabelText('Note')).toBeTruthy();
  });

  it('une note au dixième : « 3,2 / 5 », lue « 3,2 sur 5 » ; les étoiles pleines en couleur des titres', async () => {
    await show('3.2');

    expect(screen.getByTestId('field-rating-value')).toHaveTextContent('3,2');
    expect(screen.getByTestId('field-rating').props.accessibilityValue).toMatchObject({ min: 1, max: 5, now: 3.2, text: '3,2 sur 5' });
    expect(StyleSheet.flatten(screen.getByTestId('field-rating-stars-full').props.style)).toMatchObject({ color: Colors.light.text });
  });

  it('l’accessibilité règle la note de 0,1 en 0,1, dans les bornes', async () => {
    const onChange = await show('3.2');

    await fireEvent(screen.getByTestId('field-rating'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith('3.3');
    await fireEvent(screen.getByTestId('field-rating'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith('3.1');
  });

  it('aux bornes : rien sous 1, rien au-dessus de 5 ; sans note, « plus » donne 1', async () => {
    const atMax = await show('5.0');
    await fireEvent(screen.getByTestId('field-rating'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(atMax).not.toHaveBeenCalled();

    const empty = await show('');
    await fireEvent(screen.getByTestId('field-rating'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(empty).toHaveBeenLastCalledWith('1.0');
  });

  it('les bornes, l’incrément et les étoiles servis dans `range` et `stars` (décision 2026-11-27-cle-range)', async () => {
    const onChange = await show('7.5', jest.fn(), { range: { min: 0, max: 10, step: 0.5 }, stars: false });

    expect(screen.getByTestId('field-rating-value')).toHaveTextContent('7,5');
    expect(screen.getByText('/ 10')).toBeTruthy();
    expect(screen.queryByTestId('field-rating-stars')).toBeNull();
    expect(screen.getByTestId('field-rating').props.accessibilityValue).toMatchObject({ min: 0, max: 10, now: 7.5 });
    await fireEvent(screen.getByTestId('field-rating'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith('8.0');
  });
});
