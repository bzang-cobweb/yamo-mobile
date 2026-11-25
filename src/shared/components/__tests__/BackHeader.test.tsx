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
// L'état de navigation de toute l'app, tel que le test le pose.
let mockRootState: unknown;
const mockDispatch = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useRootNavigationState: () => mockRootState,
  useNavigationContainerRef: () => ({ getRootState: () => mockRootState, dispatch: mockDispatch }),
}));
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

  it('formulaire à étapes : pas de croix à l’étape 1 ; à partir de la 2e, elle ferme la page (décision 2026-11-25-croix-formulaire-etapes)', async () => {
    // Même loin du départ, l'étape 1 n'a pas de croix.
    mockRootState = { type: 'stack', key: 'root', index: 2, routes: [{}, {}, {}] };
    jest.mocked(formService.validateStep).mockResolvedValue(undefined);
    await renderScreen();

    expect(screen.queryByTestId('back-header-close')).toBeNull();
    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(screen.getByTestId('form-step-progress')).toHaveTextContent('Étape 2 sur 3'));
    await fireEvent.press(screen.getByTestId('back-header-close'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
    mockRootState = undefined;
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

  describe('la croix (décision 2026-11-19-croix-fermer)', () => {
    // Pile principale : les onglets, puis un formulaire ; dans l'onglet Profil, sa pile.
    function state(profileIndex: number, rootIndex: number) {
      const profile = { type: 'stack', key: 'profile-stack', index: profileIndex, routes: Array.from({ length: profileIndex + 1 }, () => ({})) };
      const tabs = { type: 'tab', key: 'tabs', index: 1, routes: [{}, { state: profile }] };

      return { type: 'stack', key: 'root', index: rootIndex, routes: [{ state: tabs }, ...Array.from({ length: rootIndex }, () => ({}))] };
    }

    afterEach(() => {
      mockRootState = undefined;
      mockDispatch.mockClear();
    });

    it('à un écran du départ : pas de croix, la flèche suffit', async () => {
      mockRootState = state(0, 1);
      await render(
        <I18nContext.Provider value={TEST_I18N}>
          <BackHeader title="Mes adresses" />
        </I18nContext.Provider>,
      );

      expect(screen.queryByTestId('back-header-close')).toBeNull();
    });

    it('à plus d’un écran (une liste du profil, puis un formulaire) : la croix ramène au départ', async () => {
      mockRootState = state(1, 1);
      await render(
        <I18nContext.Provider value={TEST_I18N}>
          <BackHeader title="Modifier l'adresse" />
        </I18nContext.Provider>,
      );

      const close = screen.getByTestId('back-header-close');
      expect(close.props.accessibilityLabel).toBe('Fermer');
      await fireEvent.press(close);

      // La pile de l'onglet d'abord, puis la pile principale.
      expect(mockDispatch.mock.calls.map(([action]) => action)).toEqual([
        { type: 'POP_TO_TOP', target: 'profile-stack' },
        { type: 'POP_TO_TOP', target: 'root' },
      ]);
    });
  });
});
