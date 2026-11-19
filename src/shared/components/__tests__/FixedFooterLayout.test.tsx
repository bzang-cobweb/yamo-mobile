import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { DynamicForm } from '@/features/form/components/DynamicForm';
import { FormLoader } from '@/features/form/components/FormLoader';
import { formService } from '@/features/form/services/FormService';
import type { FormDefinition } from '@/features/form/types';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { FixedFooterLayout } from '../FixedFooterLayout';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('@/features/form/services/FormService', () => ({ formService: { get: jest.fn(), validateStep: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 34, left: 0 }) }));

function definition(name: string, label: string): FormDefinition {
  return {
    name,
    title: null,
    subtitle: null,
    submit: { label },
    fields: [{ name: 'title', type: 'text', label: 'Titre', placeholder: null, help: null, required: false, default: '', options: [] }],
  };
}

// Deux formulaires montés : le premier reste (caché), le second s'ouvre puis se ferme.
function TwoForms({ onSubmit }: { onSubmit: () => Promise<void> }) {
  const [second, setSecond] = useState(false);

  return (
    <FixedFooterLayout bottomInset>
      <DynamicForm definition={definition('first', 'Enregistrer')} onSubmit={onSubmit} />
      {second && <DynamicForm definition={definition('second', 'Confirmer')} onSubmit={onSubmit} />}
      <Pressable testID="toggle" onPress={() => setSecond((value) => !value)}>
        <Text>basculer</Text>
      </Pressable>
    </FixedFooterLayout>
  );
}

describe('FixedFooterLayout (bouton d’envoi fixé en bas)', () => {
  it('le bouton du formulaire est dans la barre fixe, pas sous les champs ; il envoie', async () => {
    // Décision 2026-11-19-contrat-bouton-fixe-formulaires.
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <TwoForms onSubmit={onSubmit} />
      </I18nContext.Provider>,
    );

    const bar = screen.getByTestId('fixed-footer');
    expect(within(bar).getByText('Enregistrer')).toBeTruthy();
    expect(within(screen.getByTestId('form-first')).queryByTestId('form-submit')).toBeNull();
    // La marge du bas de l'écran sous la barre.
    expect(bar.props.style).toEqual(expect.arrayContaining([{ paddingBottom: 34 }]));

    await fireEvent.press(within(bar).getByTestId('form-submit'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('le dernier formulaire affiché tient la barre, et la rend en partant', async () => {
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <TwoForms onSubmit={jest.fn().mockResolvedValue(undefined)} />
      </I18nContext.Provider>,
    );

    await fireEvent.press(screen.getByTestId('toggle'));
    expect(within(screen.getByTestId('fixed-footer')).getByText('Confirmer')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('toggle'));
    expect(within(screen.getByTestId('fixed-footer')).getByText('Enregistrer')).toBeTruthy();
  });

  it('pendant le chargement du formulaire, la barre est déjà là, bouton désactivé ; puis le vrai bouton la remplace', async () => {
    let resolve: (value: FormDefinition) => void = () => undefined;
    jest.mocked(formService.get).mockReturnValue(new Promise((done) => (resolve = done)));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await render(
      <QueryClientProvider client={client}>
        <I18nContext.Provider value={TEST_I18N}>
          <FixedFooterLayout>
            <FormLoader name="first" onSubmit={jest.fn()} />
          </FixedFooterLayout>
        </I18nContext.Provider>
      </QueryClientProvider>,
    );

    const loading = within(screen.getByTestId('fixed-footer')).getByTestId('form-submit-loading');
    expect(loading.props.accessibilityState).toEqual({ disabled: true });

    await act(async () => resolve(definition('first', 'Enregistrer')));

    expect(await within(screen.getByTestId('fixed-footer')).findByText('Enregistrer')).toBeTruthy();
    expect(within(screen.getByTestId('fixed-footer')).queryByTestId('form-submit-loading')).toBeNull();
  });
});
