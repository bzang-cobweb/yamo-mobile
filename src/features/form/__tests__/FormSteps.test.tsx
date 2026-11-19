import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import { formService } from '../services/FormService';
import type { FormDefinition, FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('../services/FormService', () => ({ formService: { validateStep: jest.fn() } }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

/** Comme l'inscription : trois étapes. */
const register: FormDefinition = {
  name: 'auth.register',
  title: 'Créer un compte',
  subtitle: null,
  submit: { label: 'Créer mon compte' },
  fields: [
    field({ name: 'name', type: 'text' }),
    field({ name: 'gender', type: 'select', options: [{ value: 'female', label: 'Femme' }] }),
    field({ name: 'email', type: 'email' }),
    field({ name: 'password', type: 'password' }),
  ],
  steps: [
    { title: 'Vous', fields: ['name', 'gender'] },
    { title: 'Vous joindre', subtitle: 'Un e-mail, un téléphone ou les deux.', fields: ['email'] },
    { title: null, fields: ['password'] },
  ],
};

async function renderForm(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={register} onSubmit={onSubmit} />
    </I18nContext.Provider>,
  );

  return onSubmit;
}

describe('DynamicForm à étapes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('affiche une étape à la fois, avec sa progression et « Suivant »', async () => {
    await renderForm();

    expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 1 sur 3');
    expect(screen.getByTestId('form-step-title')).toHaveTextContent('Vous');
    expect(screen.queryByTestId('form-step-subtitle')).toBeNull();
    expect(screen.getByTestId('field-name')).toBeOnTheScreen();
    expect(screen.queryByTestId('field-email')).toBeNull();
    expect(screen.getByTestId('form-submit')).toHaveTextContent('Suivant');
    expect(screen.queryByTestId('form-previous')).toBeNull();
  });

  it('les champs d’une étape suivent l’ordre de l’étape, pas celui du formulaire', async () => {
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <DynamicForm definition={{ ...register, steps: [{ title: 'Vous', fields: ['gender', 'name'] }, ...register.steps!.slice(1)] }} onSubmit={jest.fn()} />
      </I18nContext.Provider>,
    );

    expect(screen.getAllByTestId(/^field-(name|gender)$/).map((node) => node.props.testID)).toEqual(['field-gender', 'field-name']);
  });

  it('le titre d’étape suit l’alignement de la définition : centré, ou à gauche par défaut', async () => {
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <DynamicForm definition={{ ...register, title_align: 'center' }} onSubmit={jest.fn()} />
      </I18nContext.Provider>,
    );
    expect(StyleSheet.flatten(screen.getByTestId('form-step-title').props.style).textAlign).toBe('center');

    await renderForm();
    expect(StyleSheet.flatten(screen.getByTestId('form-step-title').props.style).textAlign).toBe('left');
  });

  it('« Suivant » fait valider l’étape par l’API avec ses seuls champs, puis avance', async () => {
    jest.mocked(formService.validateStep).mockResolvedValue(undefined);
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByTestId('field-name'), 'marie');
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 2 sur 3'));
    expect(formService.validateStep).toHaveBeenCalledWith('auth.register', 1, { name: 'marie', gender: '' });
    expect(screen.getByTestId('field-email')).toBeOnTheScreen();
    expect(screen.getByTestId('form-step-subtitle')).toHaveTextContent('Un e-mail, un téléphone ou les deux.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('une étape refusée reste affichée avec ses erreurs', async () => {
    jest.mocked(formService.validateStep).mockRejectedValue(new ApiError(422, 'invalide', { name: ['Ce pseudonyme est déjà pris.'] }));
    await renderForm();

    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(screen.getByText('Ce pseudonyme est déjà pris.')).toBeOnTheScreen());
    expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 1 sur 3');
  });

  it('« Précédent » revient sans rien perdre ; la dernière étape envoie tout', async () => {
    jest.mocked(formService.validateStep).mockResolvedValue(undefined);
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByTestId('field-name'), 'marie');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('field-email')).toBeOnTheScreen());

    await fireEvent.press(screen.getByTestId('form-previous'));
    expect(screen.getByTestId('field-name')).toHaveDisplayValue('marie');

    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('field-email')).toBeOnTheScreen());
    await fireEvent.changeText(screen.getByTestId('field-email'), 'marie@example.com');
    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('field-password')).toBeOnTheScreen());

    expect(screen.getByTestId('form-submit')).toHaveTextContent('Créer mon compte');
    await fireEvent.changeText(screen.getByTestId('field-password'), 'secret');
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'marie', gender: '', email: 'marie@example.com', password: 'secret' }));
    expect(formService.validateStep).toHaveBeenCalledTimes(3);
  });
});
