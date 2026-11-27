import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { NumberField } from '../components/fields/NumberField';
import type { FormFieldDefinition } from '../types';

function field(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { name: 'surface', type: 'number', label: 'Surface', placeholder: null, help: null, required: true, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

async function show(definition: FormFieldDefinition) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <NumberField field={definition} value="64" onChange={jest.fn()} />
    </I18nContext.Provider>,
  );
}

describe('NumberField', () => {
  it('l’unité servie par l’API se lit dans l’aide, pas à côté de la saisie', async () => {
    await show(field({ suffix: 'm²' }));

    expect(screen.getByTestId('surface-help').props.children).toBe('En m²');
    expect(screen.queryByTestId('field-surface-suffix')).toBeNull();
    expect(screen.getByTestId('field-surface').props.accessibilityLabel).toBe('Surface (m²)');
  });

  it('une aide existante d’abord, puis l’unité', async () => {
    await show(field({ name: 'charges', label: 'Charges', help: 'En plus du loyer.', suffix: 'FCFA / mois' }));

    expect(screen.getByTestId('charges-help').props.children).toBe('En plus du loyer. En FCFA / mois');
  });

  it('en lecture seule, la zone de saisie n’a ni fond ni marges intérieures ; sinon, celui du thème (décision 2026-11-27-lecture-seule-sans-fond)', async () => {
    await show(field({ readonly: true }));
    expect(StyleSheet.flatten(screen.getByTestId('field-surface').props.style)).toMatchObject({ backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0 });

    await show(field());
    expect(StyleSheet.flatten(screen.getByTestId('field-surface').props.style).backgroundColor).not.toBe('transparent');
  });

  it('sans unité ni aide, pas de ligne d’aide', async () => {
    await show(field({ suffix: null }));

    expect(screen.queryByTestId('surface-help')).toBeNull();
  });
});
