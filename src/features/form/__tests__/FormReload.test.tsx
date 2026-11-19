import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import type { FormDefinition, FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

// La langue de saisie recharge le formulaire (décision 2026-11-19-contrat-langue-saisie-allemand).
const definition: FormDefinition = {
  name: 'test.reload',
  title: null,
  subtitle: null,
  submit: { label: 'Enregistrer' },
  fields: [
    field({ name: 'content_locale', type: 'select', reloads: true, default: 'fr', options: [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }] }),
    field({ name: 'title', type: 'text', default: 'Studio' }),
  ],
};

async function renderForm() {
  const onReload = jest.fn();
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={definition} onSubmit={jest.fn()} onReload={onReload} />
    </I18nContext.Provider>,
  );

  return onReload;
}

describe('DynamicForm : champ qui recharge le formulaire', () => {
  it('sans modification : recharge aussitôt avec la valeur choisie', async () => {
    const onReload = await renderForm();

    await fireEvent.press(screen.getByTestId('field-content_locale'));
    await fireEvent.press(screen.getByTestId('field-content_locale-option-en'));

    expect(onReload).toHaveBeenCalledWith('content_locale', 'en');
  });

  it('avec un texte modifié : demande confirmation avant de recharger', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onReload = await renderForm();

    await fireEvent.changeText(screen.getByTestId('field-title'), 'Grand studio');
    await fireEvent.press(screen.getByTestId('field-content_locale'));
    await fireEvent.press(screen.getByTestId('field-content_locale-option-en'));

    expect(onReload).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Changer ? Les modifications non enregistrées seront perdues.', undefined, expect.any(Array));
    // « Continuer » recharge.
    const buttons = alert.mock.calls[0][2] ?? [];
    buttons[1]?.onPress?.();
    expect(onReload).toHaveBeenCalledWith('content_locale', 'en');
    alert.mockRestore();
  });
});
