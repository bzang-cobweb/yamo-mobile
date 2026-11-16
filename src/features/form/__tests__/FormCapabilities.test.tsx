import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import type { FormDefinition, FormFieldDefinition } from '../types';

jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

const definition: FormDefinition = {
  name: 'test.capabilities',
  title: null,
  subtitle: null,
  submit: { label: 'Envoyer' },
  fields: [
    field({ name: 'country_id', type: 'select', options: [{ value: '1', label: 'Suisse' }, { value: '2', label: 'France' }], default: '1' }),
    field({
      name: 'region_id',
      type: 'select',
      depends_on: 'country_id',
      default: '10',
      options: [
        { value: '10', label: 'Genève', parent: '1' },
        { value: '11', label: 'Vaud', parent: '1' },
        { value: '20', label: 'Bretagne', parent: '2' },
      ],
    }),
    field({ name: 'current_phone', type: 'phone', readonly: true, default: { country: 'CH', number: '079 123 45 67' }, options: [{ value: 'CH', label: 'Suisse', hint: '+41' }] }),
    field({ name: 'phone', type: 'phone', required: true, default: { country: 'CH', number: '' }, options: [{ value: 'CH', label: 'Suisse', hint: '+41' }, { value: 'FR', label: 'France', hint: '+33' }] }),
    field({ name: 'code', type: 'code' }),
  ],
};

async function renderForm(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={definition} onSubmit={onSubmit} />
    </I18nContext.Provider>,
  );

  return onSubmit;
}

describe('DynamicForm : lecture seule, listes dépendantes, téléphone, code', () => {
  it('ne propose que les régions du pays choisi, et changer de pays vide la région', async () => {
    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByTestId('field-region_id'));
    expect(screen.getByTestId('field-region_id-option-11')).toBeTruthy();
    expect(screen.queryByTestId('field-region_id-option-20')).toBeNull();

    await fireEvent.press(screen.getByTestId('field-country_id'));
    await fireEvent.press(screen.getByTestId('field-country_id-option-2'));
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ country_id: '2', region_id: '' });
  });

  it("un champ en lecture seule s'affiche, ne se modifie pas et ne part pas", async () => {
    const onSubmit = await renderForm();

    expect(screen.getByTestId('field-current_phone')).toHaveProp('editable', false);
    expect(screen.getByTestId('field-current_phone')).toHaveProp('value', '079 123 45 67');
    expect(screen.getByTestId('field-current_phone-country')).toHaveTextContent('CH +41');

    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('current_phone');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('current_phone_country');
  });

  it('le téléphone envoie le numéro et le pays choisi ; le code ne garde que 6 chiffres', async () => {
    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByTestId('field-phone-country'));
    await fireEvent.press(screen.getByTestId('field-phone-country-option-FR'));
    await fireEvent.changeText(screen.getByTestId('field-phone'), '06 12 34 56 78');
    await fireEvent.changeText(screen.getByTestId('field-code'), '12a34 5678');
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ phone: '06 12 34 56 78', phone_country: 'FR', code: '123456' });
  });

  it("l'erreur sur le pays d'un téléphone s'affiche sous le téléphone", async () => {
    await renderForm(jest.fn().mockRejectedValue(new ApiError(422, 'Invalide', { phone_country: ['Pays requis.'] })));

    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('phone-error')).toHaveTextContent('Pays requis.');
    expect(screen.queryByTestId('form-message')).toBeNull();
  });
});
