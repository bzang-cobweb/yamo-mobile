import { fireEvent, render, screen } from '@testing-library/react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { FormField } from '../components/FormField';
import type { FormFieldDefinition } from '../types';
import { initialValue } from '../utils/values';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

// Un choix Oui / Non obligatoire est un interrupteur (décision 2026-11-23-regles-oui-non-obligatoires).
function field(required: boolean, value: string | null = null): FormFieldDefinition {
  return {
    name: 'pets', type: 'select', label: 'Animaux acceptés', placeholder: null, help: null, required, readonly: false, depends_on: null, default: value,
    options: [{ value: 'yes', label: 'Oui' }, { value: 'no', label: 'Non' }],
  };
}

async function show(element: React.ReactElement) {
  await render(<I18nContext.Provider value={TEST_I18N}>{element}</I18nContext.Provider>);
}

describe('un choix Oui / Non obligatoire', () => {
  it('s’affiche en interrupteur et envoie « yes » ou « no »', async () => {
    const onChange = jest.fn();
    await show(<FormField field={field(true)} value="no" onChange={onChange} />);

    expect(screen.getByTestId('field-pets').props.value).toBe(false);
    await fireEvent(screen.getByTestId('field-pets'), 'valueChange', true);
    expect(onChange).toHaveBeenLastCalledWith('yes');
  });

  it('part sur Non s’il n’est pas renseigné, garde Oui sinon', () => {
    expect(initialValue(field(true))).toBe('no');
    expect(initialValue(field(true, 'yes'))).toBe('yes');
  });

  it('facultatif : reste une liste déroulante', async () => {
    await show(<FormField field={field(false)} value="" onChange={jest.fn()} />);

    expect(screen.getByTestId('field-pets').props.value).toBeUndefined();
    expect(initialValue(field(false))).toBe('');
  });
});
