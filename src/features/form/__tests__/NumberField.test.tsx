import { render, screen } from '@testing-library/react-native';

import { NumberField } from '../components/fields/NumberField';
import type { FormFieldDefinition } from '../types';

function field(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { name: 'surface', type: 'number', label: 'Surface', placeholder: null, help: null, required: true, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

describe('NumberField', () => {
  it('affiche l’unité servie par l’API après la saisie', async () => {
    await render(<NumberField field={field({ suffix: 'm²' })} value="64" onChange={jest.fn()} />);

    expect(screen.getByTestId('field-surface-suffix').props.children).toBe('m²');
    expect(screen.getByTestId('field-surface').props.accessibilityLabel).toBe('Surface (m²)');
  });

  it('sans unité, rien après la saisie', async () => {
    await render(<NumberField field={field({ suffix: null })} value="" onChange={jest.fn()} />);

    expect(screen.queryByTestId('field-surface-suffix')).toBeNull();
  });
});
