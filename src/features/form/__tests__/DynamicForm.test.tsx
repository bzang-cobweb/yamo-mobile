import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { ApiError } from '@/shared/api/errors';
import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DynamicForm as BareDynamicForm } from '../components/DynamicForm';
import type { FormDefinition, FormFieldDefinition } from '../types';
import { CHECKBOX_GROUP_MAX_HEIGHT } from '../components/fields/CheckboxGroupField';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));

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
  title: null,
  subtitle: null,
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
    field({ name: 'birthday', type: 'date', label: 'Anniversaire', default: '1990-04-12' }),
  ],
};

/** Le formulaire avec les textes de l'API (en français, `TEST_MESSAGES`). */
function DynamicForm(props: Parameters<typeof BareDynamicForm>[0]) {
  return (
    <I18nContext.Provider value={TEST_I18N}>
      <BareDynamicForm {...props} />
    </I18nContext.Provider>
  );
}

describe('DynamicForm', () => {
  it('affiche un composant par type de champ, sauf le champ caché', async () => {
    await render(<DynamicForm definition={everyType} onSubmit={jest.fn()} />);

    for (const name of ['nickname', 'email', 'password', 'age', 'bio', 'city', 'terms', 'newsletter', 'birthday']) {
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

  it('une liste de cases garde une hauteur fixe et défile dans son cadre (décision 2026-11-25-cases-hauteur-fixe)', async () => {
    await render(<DynamicForm definition={everyType} onSubmit={jest.fn()} />);

    const list = screen.getByTestId('field-tags-list');
    expect(StyleSheet.flatten(list.props.style)).toMatchObject({ maxHeight: CHECKBOX_GROUP_MAX_HEIGHT });
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
      birthday: '1990-04-12',
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
  it('deux touchers rapides sur le bouton n’envoient le formulaire qu’une fois (décision 2026-11-23-pas-de-double-envoi)', async () => {
    let finish: () => void = () => {};
    const onSubmit = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    await render(<DynamicForm definition={{ ...everyType, fields: [field({ name: 'nickname', type: 'text', default: 'Ana' })] }} onSubmit={onSubmit} />);

    const button = screen.getByTestId('form-submit');
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // L'envoi fini, le bouton renvoie.
    await act(async () => finish());
    await fireEvent.press(screen.getByTestId('form-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('affiche puis masque le mot de passe, sans changer la valeur envoyée', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await render(<DynamicForm definition={everyType} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('field-password'), 's3cr€t-@');
    const toggle = screen.getByTestId('field-password-toggle');
    expect(screen.getByTestId('field-password').props.secureTextEntry).toBe(true);
    expect(toggle).toHaveProp('accessibilityLabel', 'Afficher le mot de passe');

    await fireEvent.press(toggle);
    expect(screen.getByTestId('field-password').props.secureTextEntry).toBe(false);
    expect(screen.getByTestId('field-password-toggle')).toHaveProp('accessibilityLabel', 'Masquer le mot de passe');

    await fireEvent.press(screen.getByTestId('field-password-toggle'));
    expect(screen.getByTestId('field-password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByTestId('form-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].password).toBe('s3cr€t-@');
  });

  it('affiche le titre puis le sous-titre envoyés par l’API', async () => {
    await render(
      <DynamicForm
        definition={{ ...everyType, title: 'Se connecter', subtitle: 'Accédez à votre compte yamo.' }}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByTestId('form-title')).toHaveTextContent('Se connecter');
    expect(screen.getByTestId('form-subtitle')).toHaveTextContent('Accédez à votre compte yamo.');
  });

  it('le titre dans la barre du haut : le sous-titre prend le style de titre (décision 2026-11-22-formulaire-sous-titre-style-titre)', async () => {
    await render(
      <DynamicForm definition={{ ...everyType, title: 'Réserver', subtitle: 'Studio meublé à Bonanjo' }} onSubmit={jest.fn()} hideTitle />,
    );

    expect(screen.queryByTestId('form-title')).toBeNull();
    const subtitle = screen.getByTestId('form-subtitle');
    expect(subtitle).toHaveTextContent('Studio meublé à Bonanjo');
    expect(subtitle.props.accessibilityRole).toBe('header');
    // 18 en gras, pas le grand titre (décision 2026-11-22-formulaire-titre-plus-petit).
    expect(StyleSheet.flatten(subtitle.props.style)).toMatchObject({ fontSize: 18, fontWeight: '700' });
  });

  it('une note de champ, avant son libellé, en orange (décision 2026-11-22-champ-note)', async () => {
    await render(
      <DynamicForm
        definition={{ ...everyType, fields: [field({ name: 'others', type: 'checkbox', label: 'Accepter aussi les autres visites', notice: '2 autres visites ce jour-là.' })] }}
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.getByTestId('others-notice')).toHaveTextContent('2 autres visites ce jour-là.');
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('2 autres visites ce jour-là.')).toBeLessThan(tree.indexOf('Accepter aussi les autres visites'));
  });

  it('une note à part, sous le titre, en orange (décision 2026-11-22-formulaire-note)', async () => {
    await render(
      <DynamicForm
        definition={{ ...everyType, title: 'Accepter la demande', subtitle: 'Marie Curie · du 3 déc. 2026 au 6 déc. 2026', description: 'Studio meublé à Bonanjo', notice: '2 autres visites sont demandées ce jour-là.' }}
        onSubmit={jest.fn()}
        hideTitle
      />,
    );

    const notice = screen.getByTestId('form-notice');
    expect(notice).toHaveTextContent('2 autres visites sont demandées ce jour-là.');
    expect(screen.getByTestId('form-subtitle')).toHaveTextContent('Marie Curie · du 3 déc. 2026 au 6 déc. 2026');
    const tree = JSON.stringify(screen.toJSON());
    // La description entre le sous-titre et la note (décision 2026-11-22-formulaire-description).
    expect(screen.getByTestId('form-description')).toHaveTextContent('Studio meublé à Bonanjo');
    expect(tree.indexOf('"form-subtitle"')).toBeLessThan(tree.indexOf('"form-description"'));
    expect(tree.indexOf('"form-description"')).toBeLessThan(tree.indexOf('"form-notice"'));
  });

  it('avec un titre de navigation : le titre en gras en tête du contenu, le sous-titre en gris (décision 2026-11-22-formulaire-titre-navigation)', async () => {
    await render(
      <DynamicForm
        definition={{ ...everyType, navigation_title: 'Accepter la demande', title: 'Marie Curie · du 3 déc. 2026 au 6 déc. 2026', subtitle: 'Studio meublé à Bonanjo' }}
        onSubmit={jest.fn()}
        hideTitle
      />,
    );

    const title = screen.getByTestId('form-title');
    expect(title).toHaveTextContent('Marie Curie · du 3 déc. 2026 au 6 déc. 2026');
    expect(StyleSheet.flatten(title.props.style)).toMatchObject({ fontSize: 18, fontWeight: '700' });
    expect(screen.getByTestId('form-subtitle')).toHaveTextContent('Studio meublé à Bonanjo');
    expect(screen.queryByText('Accepter la demande')).toBeNull();
  });

  it('sans titre ni sous-titre, n’affiche aucun en-tête', async () => {
    await render(<DynamicForm definition={everyType} onSubmit={jest.fn()} />);

    expect(screen.queryByTestId('form-title')).toBeNull();
    expect(screen.queryByTestId('form-subtitle')).toBeNull();
  });

  it("garde l'aide sous le champ et affiche l'erreur en plus, distincte", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new ApiError(422, 'Invalide', { nickname: ['Pseudonyme déjà pris.'] }));
    await render(<DynamicForm definition={everyType} onSubmit={onSubmit} />);

    expect(screen.getByTestId('nickname-help')).toHaveTextContent('Visible par tous');
    await fireEvent.press(screen.getByTestId('form-submit'));

    expect(await screen.findByTestId('nickname-error')).toHaveTextContent('Pseudonyme déjà pris.');
    expect(screen.getByTestId('nickname-help')).toHaveTextContent('Visible par tous');
    expect(screen.getByTestId('nickname-error')).toHaveProp('accessibilityRole', 'alert');
  });

  it('affiche une seule fois l’aide d’une case à cocher et d’un interrupteur', async () => {
    const withHelp: FormDefinition = {
      ...everyType,
      fields: [
        field({ name: 'terms', type: 'checkbox', label: "J'accepte", help: 'Conditions générales' }),
        field({ name: 'newsletter', type: 'switch', label: 'Newsletter', help: 'Un e-mail par mois' }),
      ],
    };
    await render(<DynamicForm definition={withHelp} onSubmit={jest.fn()} />);

    expect(screen.getAllByText('Conditions générales')).toHaveLength(1);
    expect(screen.getAllByText('Un e-mail par mois')).toHaveLength(1);
  });
});
