import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import type { FormDefinition, FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

const switzerland = [{ value: 'CH', label: 'Suisse', hint: '+41' }];

async function renderForm(definition: FormDefinition, onSubmit = jest.fn().mockResolvedValue(undefined)) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={definition} onSubmit={onSubmit} />
    </I18nContext.Provider>,
  );

  return onSubmit;
}

/** L'identifiant de connexion quand l'application a les deux canaux. */
const login: FormDefinition = {
  name: 'auth.login',
  title: null,
  subtitle: null,
  submit: { label: 'Se connecter' },
  fields: [
    field({
      name: 'channel',
      type: 'segmented',
      default: 'email',
      required: true,
      options: [
        { value: 'email', label: 'E-mail' },
        { value: 'phone', label: 'Téléphone' },
      ],
    }),
    field({ name: 'email', type: 'email', required: true, visible_when: { field: 'channel', value: 'email' } }),
    field({ name: 'phone', type: 'phone', required: true, options: switzerland, locked: true, default: { country: 'CH', number: null }, visible_when: { field: 'channel', value: 'phone' } }),
    field({ name: 'password', type: 'password', required: true }),
  ],
};

describe('Champs conditionnels, sélecteur à boutons et option verrouillée', () => {
  it("le sélecteur n'affiche que le champ choisi et n'envoie que lui", async () => {
    const onSubmit = await renderForm(login);

    expect(screen.getByTestId('field-email')).toBeOnTheScreen();
    expect(screen.queryByTestId('field-phone')).toBeNull();
    expect(screen.getByTestId('field-channel-option-email').props.accessibilityState).toMatchObject({ selected: true });

    await fireEvent.press(screen.getByTestId('field-channel-option-phone'));
    await fireEvent.changeText(await screen.findByTestId('field-phone'), '079 123 45 67');
    expect(screen.queryByTestId('field-email')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('field-password'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({ channel: 'phone', phone: '079 123 45 67', phone_country: 'CH', password: 'secret' });
  });

  it('un pays unique est choisi d’office et verrouillé, le numéro reste à saisir', async () => {
    await renderForm({ ...login, fields: [field({ name: 'phone', type: 'phone', options: switzerland, locked: true, default: { country: 'CH', number: null } })] });

    expect(screen.getByTestId('field-phone-country')).toBeDisabled();
    expect(screen.getByText('CH +41')).toBeOnTheScreen();
    expect(screen.getByTestId('field-phone')).not.toBeDisabled();
  });

  it('une liste verrouillée ne change pas mais part avec le formulaire', async () => {
    const onSubmit = await renderForm({
      ...login,
      fields: [field({ name: 'country_id', type: 'select', options: [{ value: '1', label: 'Suisse' }], locked: true, default: '1' })],
    });

    expect(screen.getByTestId('field-country_id')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ country_id: '1' }));
  });
});
