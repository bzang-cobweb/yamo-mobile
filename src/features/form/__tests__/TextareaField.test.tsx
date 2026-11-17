import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextareaField } from '../components/fields/TextareaField';
import type { FormFieldDefinition } from '../types';

function field(overrides: Partial<FormFieldDefinition> = {}): FormFieldDefinition {
  return { name: 'description', type: 'textarea', label: 'Description', placeholder: null, help: null, required: false, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

describe('TextareaField', () => {
  it('limite la saisie au nombre de caractères envoyé par l’API et affiche le compteur', async () => {
    const onChange = jest.fn();
    await render(<TextareaField field={field({ max_length: 1000 })} value="Bonjour" onChange={onChange} />);

    expect(screen.getByTestId('field-description').props.maxLength).toBe(1000);
    expect(screen.getByTestId('field-description-counter')).toHaveTextContent('7 / 1000');

    await fireEvent.changeText(screen.getByTestId('field-description'), 'Salut');
    expect(onChange).toHaveBeenCalledWith('Salut');
  });

  it('sans limite, ni maxLength ni compteur', async () => {
    await render(<TextareaField field={field({ max_length: null })} value="" onChange={jest.fn()} />);

    expect(screen.getByTestId('field-description').props.maxLength).toBeUndefined();
    expect(screen.queryByTestId('field-description-counter')).toBeNull();
  });
});
