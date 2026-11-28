import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import type { FormDefinition, FormFieldDefinition } from '../types';

// Un code complet envoie le formulaire ; l'app peut choisir des valeurs de départ (décision 2026-11-28-app-connexion-panneau).
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

const code: FormDefinition = { name: 'auth.code', title: null, subtitle: null, submit: { label: 'Valider' }, fields: [field({ name: 'code', type: 'code' })] };

const login: FormDefinition = {
  name: 'auth.login',
  title: null,
  subtitle: null,
  submit: { label: 'Continuer' },
  fields: [
    field({ name: 'channel', type: 'segmented', default: 'email', options: [{ value: 'email', label: 'E-mail' }, { value: 'phone', label: 'Téléphone' }] }),
    field({ name: 'email', type: 'email', visible_when: { field: 'channel', value: 'email' } }),
    field({ name: 'phone', type: 'phone', default: { country: 'CM', number: null }, visible_when: { field: 'channel', value: 'phone' }, options: [{ value: 'CM', label: 'Cameroun' }, { value: 'CH', label: 'Suisse' }] }),
  ],
};

async function show(definition: FormDefinition, onSubmit: jest.Mock, defaults?: Record<string, string>) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={definition} onSubmit={onSubmit} defaults={defaults} />
    </I18nContext.Provider>,
  );
}

describe('DynamicForm : code complet et valeurs de départ', () => {
  it('le sixième chiffre envoie le formulaire, une seule fois, sans toucher le bouton', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await show(code, onSubmit);

    await fireEvent.changeText(screen.getByTestId('field-code'), '12345');
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('field-code'), '123456');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ code: '123456' });
  });

  it('le bouton servi reste là et envoie aussi', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await show(code, onSubmit);

    await fireEvent.press(screen.getByTestId('form-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ code: '' });
  });

  it('les valeurs de l’app remplacent celles servies, pour les seuls champs du formulaire', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await show(login, onSubmit, { channel: 'phone', phone_country: 'CH', other: 'x' });

    expect(screen.getByTestId('field-phone')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('form-submit'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ channel: 'phone', phone_country: 'CH' }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('other');
  });
});
