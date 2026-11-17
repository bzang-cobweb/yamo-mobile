import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm } from '../components/DynamicForm';
import { SUGGESTION_DELAY_MS } from '../components/fields/SuggestionList';
import type { FieldSuggestions, FormDefinition, FormFieldDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

const mockGet = jest.fn();
jest.mock('@/shared/api/ApiClient', () => ({ apiClient: { get: (...args: unknown[]) => mockGet(...args) } }));

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, readonly: false, depends_on: null, default: null, options: [], ...overrides };
}

const STREET_SUGGESTIONS: FieldSuggestions = { endpoint: '/v1/addresses/suggestions', params: ['country_id'], min_length: 3 };

/** Un formulaire d'adresse : la rue propose les adresses existantes du pays choisi. */
function definition(suggestions: FieldSuggestions = STREET_SUGGESTIONS): FormDefinition {
  return {
    name: 'location.address',
    title: null,
    subtitle: null,
    submit: { label: 'Enregistrer' },
    fields: [
      field({ name: 'first_name', type: 'text', default: 'Jeanne' }),
      field({ name: 'country_id', type: 'select', options: [{ value: '1', label: 'Suisse' }, { value: '2', label: 'France' }], default: '1' }),
      field({ name: 'street', type: 'text', suggestions }),
      field({ name: 'zip', type: 'text' }),
      field({ name: 'city', type: 'text' }),
      field({ name: 'locked_code', type: 'text', readonly: true, default: 'X' }),
    ],
  };
}

async function renderForm(form: FormDefinition = definition()) {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DynamicForm definition={form} onSubmit={onSubmit} />
    </I18nContext.Provider>,
  );

  return onSubmit;
}

async function type(text: string) {
  await fireEvent.changeText(screen.getByTestId('field-street'), text);
  await act(async () => {
    jest.advanceTimersByTime(SUGGESTION_DELAY_MS);
  });
}

describe('Champ à suggestions (adresses existantes)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGet.mockReset();
    mockGet.mockResolvedValue({
      data: [
        {
          label: 'Rue du Lac 4 — 1200 Genève',
          values: { country_id: '1', street: 'Rue du Lac 4', zip: '1200', city: 'Genève', locked_code: 'Y', password: 'secret' },
        },
        { label: 'Mal formée', values: { street: 4 } },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('demande les suggestions à partir de 3 caractères, avec le pays choisi', async () => {
    await renderForm();

    await type('ru');
    expect(mockGet).not.toHaveBeenCalled();

    await type('rue du');
    expect(mockGet).toHaveBeenCalledWith('/v1/addresses/suggestions?q=rue+du&country_id=1');
    expect(screen.getByText('Rue du Lac 4 — 1200 Genève')).toBeTruthy();
    // Une suggestion mal formée n'est pas affichée.
    expect(screen.queryByText('Mal formée')).toBeNull();
  });

  it('choisir une suggestion remplit les champs de l’adresse, ni les champs en lecture seule ni les inconnus', async () => {
    const onSubmit = await renderForm();

    await type('rue du');
    await fireEvent.press(screen.getByTestId('field-street-suggestion-0'));

    expect(screen.queryByTestId('field-street-suggestions')).toBeNull();
    expect(screen.getByTestId('field-street').props.value).toBe('Rue du Lac 4');
    expect(screen.getByTestId('field-zip').props.value).toBe('1200');
    expect(screen.getByTestId('field-city').props.value).toBe('Genève');

    await fireEvent.press(screen.getByTestId('form-submit'));
    await act(async () => undefined);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Jeanne', country_id: '1', street: 'Rue du Lac 4', zip: '1200', city: 'Genève' }),
    );
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('locked_code', 'Y');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('password');
  });

  it('une erreur de l’API n’affiche rien, la saisie libre reste possible', async () => {
    mockGet.mockRejectedValue(new Error('429'));
    await renderForm();

    await type('rue du');

    expect(screen.queryByTestId('field-street-suggestions')).toBeNull();
    expect(screen.getByTestId('field-street').props.value).toBe('rue du');
  });

  it('un point d’API hors de /v1 n’est jamais appelé', async () => {
    await renderForm(definition({ ...STREET_SUGGESTIONS, endpoint: 'https://example.test/v1/addresses' }));

    await type('rue du');

    expect(mockGet).not.toHaveBeenCalled();
  });
});
