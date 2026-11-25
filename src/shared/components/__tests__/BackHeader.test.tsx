import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { DynamicForm } from '@/features/form/components/DynamicForm';
import { formService } from '@/features/form/services/FormService';
import type { FormDefinition, FormFieldDefinition } from '@/features/form/types';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { BackStackProvider } from '@/shared/navigation/BackStack';

import { BackHeader } from '../BackHeader';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/features/form/services/FormService', () => ({ formService: { validateStep: jest.fn() } }));

function field(name: string): FormFieldDefinition {
  return { name, type: 'text', label: name, placeholder: null, help: null, required: false, readonly: false, depends_on: null, default: null, options: [] };
}

const register: FormDefinition = {
  name: 'auth.register',
  title: 'Créer un compte',
  subtitle: null,
  submit: { label: 'Créer mon compte' },
  fields: [field('name'), field('email'), field('password')],
  steps: [
    { title: 'Vous', fields: ['name'] },
    { title: 'Vous joindre', fields: ['email'] },
    { title: null, fields: ['password'] },
  ],
};

async function renderScreen() {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <BackStackProvider>
        <BackHeader title="Créer un compte" />
        <DynamicForm definition={register} onSubmit={jest.fn()} hideTitle />
      </BackStackProvider>
    </I18nContext.Provider>,
  );
}

describe('BackHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('affiche la flèche sans libellé et le titre au centre ; le formulaire ne répète pas le titre', async () => {
    await renderScreen();

    expect(screen.getByTestId('back-header-title')).toHaveTextContent('Créer un compte');
    expect(screen.getByTestId('back-header-link')).toHaveProp('accessibilityLabel', 'Retour');
    expect(screen.getByTestId('back-header-link')).toHaveTextContent('');
    expect(screen.queryByTestId('form-title')).toBeNull();
  });

  it('formulaire à étapes : pas de croix à l’étape 1 ; à partir de la 2e, elle ferme la page (décision 2026-11-26-croix-etapes-seulement)', async () => {
    jest.mocked(formService.validateStep).mockResolvedValue(undefined);
    await renderScreen();

    expect(screen.queryByTestId('back-header-close')).toBeNull();
    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 2 sur 3'));
    await fireEvent.press(screen.getByTestId('back-header-close'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('à l’étape 1, revient à l’écran précédent ; à partir de l’étape 2, à l’étape précédente', async () => {
    jest.mocked(formService.validateStep).mockResolvedValue(undefined);
    await renderScreen();

    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 2 sur 3'));
    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 3 sur 3'));

    // Pas de lien « Précédent » dans le formulaire : c'est la flèche de l'en-tête.
    expect(screen.queryByTestId('form-previous')).toBeNull();

    await fireEvent.press(screen.getByTestId('back-header-link'));
    expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 2 sur 3');
    await fireEvent.press(screen.getByTestId('back-header-link'));
    expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 1 sur 3');
    expect(router.back).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('back-header-link'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('hors d’un formulaire à étapes : jamais de croix, la flèche seule (décision 2026-11-26-croix-etapes-seulement)', async () => {
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <BackStackProvider>
          <BackHeader title="Modifier une adresse" />
        </BackStackProvider>
      </I18nContext.Provider>,
    );

    expect(screen.getByTestId('back-header-link')).toBeTruthy();
    expect(screen.queryByTestId('back-header-close')).toBeNull();
  });
});
