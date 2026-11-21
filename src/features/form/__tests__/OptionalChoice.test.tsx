import { fireEvent, render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { RadioField } from '../components/fields/RadioField';
import { SelectField } from '../components/fields/SelectField';
import type { FormFieldDefinition } from '../types';

// Un choix facultatif se retire (décision 2026-11-21-choix-facultatif-effacable) : « Non-fumeurs », « Animaux »…
function field(type: 'select' | 'radio', required: boolean): FormFieldDefinition {
  return {
    name: 'smoking', type, label: 'Fumeurs acceptés', placeholder: null, help: null, required, readonly: false, depends_on: null, default: null,
    options: [{ value: 'yes', label: 'Oui' }, { value: 'no', label: 'Non' }],
  };
}

async function show(element: React.ReactElement) {
  await render(<I18nContext.Provider value={TEST_I18N}>{element}</I18nContext.Provider>);
}

describe('un choix facultatif', () => {
  it('liste déroulante : « Aucun » en tête retire la valeur', async () => {
    const onChange = jest.fn();
    await show(<SelectField field={field('select', false)} value="no" onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('field-smoking'));
    expect(screen.getByTestId('field-smoking-option-none')).toHaveTextContent('Aucun');
    await fireEvent.press(screen.getByTestId('field-smoking-option-none'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('liste déroulante obligatoire : pas de « Aucun »', async () => {
    await show(<SelectField field={field('select', true)} value="no" onChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('field-smoking'));

    expect(screen.queryByTestId('field-smoking-option-none')).toBeNull();
  });

  it('boutons radio : un second toucher décoche, sauf si obligatoire', async () => {
    const onChange = jest.fn();
    await show(<RadioField field={field('radio', false)} value="no" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('field-smoking-option-no'));
    expect(onChange).toHaveBeenLastCalledWith('');
    await fireEvent.press(screen.getByTestId('field-smoking-option-yes'));
    expect(onChange).toHaveBeenLastCalledWith('yes');
  });

  it('boutons radio obligatoires : l’option cochée le reste', async () => {
    const onChange = jest.fn();
    await show(<RadioField field={field('radio', true)} value="no" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('field-smoking-option-no'));

    expect(onChange).toHaveBeenLastCalledWith('no');
  });
});
