import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import type { FormDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

function definition(links?: FormDefinition['links']): FormDefinition {
  return {
    name: 'auth.profile.email',
    title: null,
    subtitle: null,
    fields: [{ name: 'current_email', type: 'text', label: 'Adresse e-mail actuelle', placeholder: null, help: null, required: false, readonly: true, default: 'j•••@example.com', options: [] }],
    links,
    submit: { label: 'Envoyer le code' },
  };
}

async function renderForm(form: FormDefinition) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={form} onSubmit={jest.fn()} />
    </I18nContext.Provider>,
  );
}

describe('DynamicForm : les liens servis sous le formulaire (décision 2026-11-27-formulaire-liens)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('affiche chaque lien et ouvre son formulaire dans le profil', async () => {
    await renderForm(definition([{ label: 'Vérifier mon adresse', form: 'auth.profile.email.verify' }]));

    expect(screen.getByTestId('form-link-auth.profile.email.verify')).toHaveTextContent('Vérifier mon adresse');
    await fireEvent.press(screen.getByTestId('form-link-auth.profile.email.verify'));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/profile/[form]', params: { form: 'auth.profile.email.verify' } });
  });

  it('sans liens (absents ou vides) : rien', async () => {
    await renderForm(definition());
    expect(screen.queryAllByTestId(/^form-link-/)).toHaveLength(0);

    await renderForm(definition([]));
    expect(screen.queryAllByTestId(/^form-link-/)).toHaveLength(0);
  });

  it('la valeur actuelle, masquée, est affichée en lecture seule', async () => {
    await renderForm(definition());

    expect(screen.getByDisplayValue('j•••@example.com')).toBeTruthy();
  });
});
