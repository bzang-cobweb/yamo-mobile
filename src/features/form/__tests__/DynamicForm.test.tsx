import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/shared/api/errors';

import { DynamicForm } from '../components/DynamicForm';
import type { FormDefinition, FormFieldDefinition } from '../types';

function field(overrides: Partial<FormFieldDefinition> & Pick<FormFieldDefinition, 'name' | 'type'>): FormFieldDefinition {
  return { label: overrides.name, placeholder: null, help: null, required: false, default: null, options: [], ...overrides };
}

const options = [
  { value: 'ge', label: 'Genève' },
  { value: 'vd', label: 'Vaud' },
];

/** Un formulaire avec un champ de chaque type, tel que l'API pourrait l'envoyer. */
const everyType: FormDefinition = {
  name: 'test.all',
  submit: { label: 'Envoyer' },
  fields: [
    field({ name: 'nickname', type: 'text', label: 'Pseudonyme', required: true, help: 'Visible par tous' }),
    field({ name: 'token', type: 'hidden', default: 'abc' }),
    field({ name: 'email', type: 'email', label: 'E-mail' }),
    field({ name: 'password', type: 'password', label: 'Mot de passe' }),
    field({ name: 'age', type: 'number', label: 'Âge' }),
    field({ name: 'bio', type: 'textarea', label: 'Bio' }),
    field({ name: 'city', type: 'select', label: 'Canton', options, default: 'vd' }),
    field({ name: 'size', type: 'radio', label: 'Taille', options: [{ value: 's', label: 'S' }, { value: 'm', label: 'M' }] }),
    field({ name: 'terms', type: 'checkbox', label: "J'accepte" }),
    field({ name: 'tags', type: 'checkbox_group', label: 'Intérêts', options }),
    field({ name: 'newsletter', type: 'switch', label: 'Newsletter', default: true }),
  ],
};

describe('DynamicForm', () => {
  it('affiche un composant par type de champ, sauf le champ caché', async () => {
    await render(<DynamicForm definition={everyType} onSubmit={jest.fn()} />);

    for (const name of ['nickname', 'email', 'password', 'age', 'bio', 'city', 'terms', 'newsletter']) {
      expect(screen.getByTestId(`field-${name}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('field-size-option-m')).toBeOnTheScreen();
    expect(screen.getByTestId('field-tags-option-vd')).toBeOnTheScreen();
    expect(screen.queryByTestId('field-token')).toBeNull();

    expect(screen.getByText(/^Pseudonyme/)).toBeOnTheScreen();
    expect(screen.getByText('Visible par tous')).toBeOnTheScreen();
    expect(screen.getByTestId('field-city')).toHaveAccessibilityValue({ text: 'Vaud' }); // valeur par défaut du sélecteur
    expect(screen.getByText('Envoyer')).toBeOnTheScreen();
  });

  it('le mot de passe est masqué et l’e-mail a le clavier adapté', async () => {
    await render(<DynamicForm definition={everyType} onSubmit={jest.fn()} />);

    expect(screen.getByTestId('field-password').props.secureTextEntry).toBe(true);
    expect(screen.getByTestId('field-email').props.keyboardType).toBe('email-address');
  });

  it('envoie les valeurs saisies, valeurs par défaut et champ caché compris', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<DynamicForm definition={everyType} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('field-nickname'), 'jeanne');
    await fireEvent.press(screen.getByTestId('field-city'));
    await fireEvent.press(screen.getByTestId('field-city-option-ge'));
    await fireEvent.press(screen.getByTestId('field-size-option-m'));
    await fireEvent.press(screen.getByTestId('field-terms'));
    await fireEvent.press(screen.getByTestId('field-tags-option-vd'));
    await fireEvent.press(screen.getByTestId('field-tags-option-ge'));
    await fireEvent.press(screen.getByTestId('form-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      nickname: 'jeanne',
      token: 'abc',
      email: '',
      password: '',
      age: '',
      bio: '',
      city: 'ge',
      size: 'm',
      terms: true,
      tags: ['vd', 'ge'],
      newsletter: true,
    });
  });

  it("affiche les erreurs 422 de l'API sous les champs concernés", async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      new ApiError(422, 'Invalid', { nickname: ['Le pseudonyme est déjà pris.'], 'tags.1': ['Choix invalide.'] }),
    );
    await render(<DynamicForm definition={everyType} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('nickname-error')).toHaveTextContent('Le pseudonyme est déjà pris.');
    expect(screen.getByTestId('tags-error')).toHaveTextContent('Choix invalide.');
    expect(screen.queryByTestId('form-message')).toBeNull();

    // Corriger le champ efface son erreur.
    await fireEvent.changeText(screen.getByTestId('field-nickname'), 'autre');
    expect(screen.queryByTestId('nickname-error')).toBeNull();
  });

  it("affiche en message général une erreur qui ne vise aucun champ affiché", async () => {
    const onSubmit = jest.fn().mockRejectedValue(
      new ApiError(429, 'Too Many Attempts.', {}),
    );
    await render(<DynamicForm definition={everyType} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('form-message')).toHaveTextContent('Too Many Attempts.');
  });
});
