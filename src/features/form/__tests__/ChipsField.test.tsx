import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { Colors } from '@/shared/theme/theme';

import { FormField } from '../components/FormField';
import type { FormFieldDefinition } from '../types';
import { initialValue } from '../utils/values';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(): FormFieldDefinition {
  return {
    name: 'feature_flags',
    type: 'chips',
    label: 'Équipements',
    placeholder: null,
    help: null,
    required: false,
    default: null,
    options: [
      { value: '1', label: 'Wifi' },
      { value: '2', label: 'Parking' },
    ],
  };
}

async function show(value: string[], onChange = jest.fn()) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <FormField field={field()} value={value} onChange={onChange} />
    </I18nContext.Provider>,
  );

  return onChange;
}

describe('ChipsField (type « chips », décision 2026-11-26-filtres-en-puces)', () => {
  it('une puce par option, sur une ligne qui défile ; vide au départ', async () => {
    await show([]);

    expect(screen.getByTestId('field-feature_flags-chips').props.horizontal).toBe(true);
    expect(screen.getByTestId('field-feature_flags-option-1')).toHaveTextContent('Wifi');
    expect(screen.getByTestId('field-feature_flags-option-2')).toHaveTextContent('Parking');
    expect(initialValue(field())).toEqual([]);
  });

  it('le nombre de puces choisies entre parenthèses après le libellé ; aucune, le libellé seul (décision 2026-11-26-puces-nombre-choisi)', async () => {
    await show(['1', '2']);
    expect(screen.getByText('Équipements (2)')).toBeTruthy();
    await screen.rerender(
      <I18nContext.Provider value={TEST_I18N}>
        <FormField field={field()} value={[]} onChange={jest.fn()} />
      </I18nContext.Provider>,
    );
    expect(screen.getByText('Équipements')).toBeTruthy();
  });

  it('un appui ajoute la puce aux choix, un autre la retire', async () => {
    const onChange = await show(['2']);

    await fireEvent.press(screen.getByTestId('field-feature_flags-option-1'));
    expect(onChange).toHaveBeenLastCalledWith(['2', '1']);
    await fireEvent.press(screen.getByTestId('field-feature_flags-option-2'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('choisie : fond noir, texte blanc ; sinon bordée, coins arrondis', async () => {
    await show(['1']);

    const chosen = StyleSheet.flatten(screen.getByTestId('field-feature_flags-option-1').props.style);
    const other = StyleSheet.flatten(screen.getByTestId('field-feature_flags-option-2').props.style);
    expect(chosen).toMatchObject({ backgroundColor: Colors.light.text, borderWidth: 1 });
    expect(other.backgroundColor).toBeUndefined();
    expect(other).toMatchObject({ borderWidth: 1, borderColor: Colors.light.backgroundSelected });
    expect(other.borderRadius).toBeGreaterThan(0);
    expect(screen.getByTestId('field-feature_flags-option-1').props.accessibilityState).toMatchObject({ checked: true });
  });
});
