import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { Colors } from '@/shared/theme/theme';

import { FormField } from '../components/FormField';
import type { FieldValue, FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(overrides: Partial<FormFieldDefinition>): FormFieldDefinition {
  return { name: 'choice', type: 'segmented', label: 'Choix', placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

async function show(definition: FormFieldDefinition, value: FieldValue) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <FormField field={definition} value={value} onChange={jest.fn()} />
    </I18nContext.Provider>,
  );
}

describe('sélection noir et blanc (décision 2026-11-26-selection-noir-et-blanc)', () => {
  it('segments : l’option choisie en fond noir, texte blanc', async () => {
    await show(field({ options: [{ value: 'any', label: 'Tous' }, { value: 'yes', label: 'Oui' }] }), 'yes');

    expect(StyleSheet.flatten(screen.getByTestId('field-choice-option-yes').props.style)).toMatchObject({ backgroundColor: Colors.light.text });
    expect(StyleSheet.flatten(screen.getByTestId('field-choice-option-any').props.style).backgroundColor).toBeUndefined();
    expect(StyleSheet.flatten(screen.getByText('Oui').props.style)).toMatchObject({ color: Colors.light.background });
  });

  it('interrupteur : piste noire allumé, bouton blanc', async () => {
    await show(field({ name: 'pets', type: 'switch', label: 'Animaux' }), true);

    const toggle = screen.getByTestId('field-pets');
    expect(toggle.props.onTintColor ?? toggle.props.trackColor?.true).toBe(Colors.light.text);
    expect(toggle.props.thumbTintColor ?? toggle.props.thumbColor).toBe(Colors.light.background);
  });
});
