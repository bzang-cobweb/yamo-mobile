import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import type { ApiClient } from '@/shared/api/ApiClient';

import { DynamicForm } from '../components/DynamicForm';
import { FormService, formService } from '../services/FormService';
import type { FormDefinition, FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

const DEFINITION: FormDefinition = {
  name: 'offer.offer',
  title: null,
  subtitle: null,
  submit: { label: 'Enregistrer' },
  fields: [
    field({ name: 'street', type: 'text', suggestions: '/v1/addresses/suggestions' }),
    field({ name: 'zip', type: 'text' }),
    field({ name: 'city', type: 'text' }),
  ],
};

describe('suggestions d’un champ texte (décision 2026-11-19-contrat-adresse-offre-recherche)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('dès 3 caractères, propose les adresses ; en choisir une remplit la rue, le code postal et la ville', async () => {
    const suggestions = jest
      .spyOn(formService, 'suggestions')
      .mockResolvedValue([{ value: 'Rue Njo-Njo', label: 'Rue Njo-Njo — 00237 Douala', fill: { zip: '00237', city: 'Douala' } }]);
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(
      <I18nContext.Provider value={TEST_I18N}>
        <DynamicForm definition={DEFINITION} onSubmit={onSubmit} />
      </I18nContext.Provider>,
    );

    await fireEvent.changeText(screen.getByTestId('field-street'), 'Nj');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(suggestions).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('field-street'), 'Njo');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(suggestions).toHaveBeenCalledWith('/v1/addresses/suggestions', 'Njo');
    expect(screen.getByText('Rue Njo-Njo — 00237 Douala')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('field-street-suggestion-0'));

    expect(screen.getByTestId('field-street').props.value).toBe('Rue Njo-Njo');
    expect(screen.getByTestId('field-zip').props.value).toBe('00237');
    expect(screen.getByTestId('field-city').props.value).toBe('Douala');
    // Une fois choisie, la liste disparaît.
    expect(screen.queryByTestId('field-street-suggestions')).toBeNull();
  });

  it('le service refuse un point d’API d’une autre forme', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: [] }) };
    const service = new FormService(client as unknown as ApiClient);

    await service.suggestions('/v1/addresses/suggestions', 'rue du lac');
    expect(client.get).toHaveBeenCalledWith('/v1/addresses/suggestions?q=rue%20du%20lac');
    await expect(service.suggestions('https://evil.test', 'x')).rejects.toThrow();
    await expect(service.suggestions('/v1/../admin', 'x')).rejects.toThrow();
  });
});
