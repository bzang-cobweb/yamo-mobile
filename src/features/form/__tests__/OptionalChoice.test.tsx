import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { RadioField } from '../components/fields/RadioField';
import { SEARCHABLE_LIMIT, SelectField } from '../components/fields/SelectField';
import type { FormFieldDefinition } from '../types';

// Les panneaux qui montent du bas (`BottomSheet`), dont la fenêtre de choix : leurs marges de fenêtre.
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

// Un choix facultatif se retire (décision 2026-11-21-choix-facultatif-effacable) : « Non-fumeurs », « Animaux »…
function field(type: 'select' | 'radio', required: boolean): FormFieldDefinition {
  return {
    name: 'smoking', type, label: 'Fumeurs acceptés', placeholder: null, help: null, required, readonly: false, depends_on: null, default: null,
    options: [{ value: 'yes', label: 'Oui' }, { value: 'no', label: 'Non' }],
  };
}

async function show(element: React.ReactElement) {
  await render(<I18nContext.Provider value={TEST_I18N}>{element}</I18nContext.Provider>);
}

describe('un choix facultatif', () => {
  it('liste déroulante : « Aucun » en tête retire la valeur', async () => {
    const onChange = jest.fn();
    await show(<SelectField field={field('select', false)} value="no" onChange={onChange} />);

    await fireEvent.press(screen.getByTestId('field-smoking'));
    expect(screen.getByTestId('field-smoking-option-none')).toHaveTextContent('Aucun');
    await fireEvent.press(screen.getByTestId('field-smoking-option-none'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('liste déroulante qui a déjà une option vide (« Tous » d’un filtre) : pas de « Aucun » en plus', async () => {
    const definition = field('select', false);
    await show(<SelectField field={{ ...definition, options: [{ value: '', label: 'Tous' }, ...definition.options] }} value="" onChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('field-smoking'));

    expect(screen.queryByTestId('field-smoking-option-none')).toBeNull();
  });

  it('liste déroulante obligatoire : pas de « Aucun »', async () => {
    await show(<SelectField field={field('select', true)} value="no" onChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('field-smoking'));

    expect(screen.queryByTestId('field-smoking-option-none')).toBeNull();
  });

  it('boutons radio : un second toucher décoche, sauf si obligatoire', async () => {
    const onChange = jest.fn();
    await show(<RadioField field={field('radio', false)} value="no" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('field-smoking-option-no'));
    expect(onChange).toHaveBeenLastCalledWith('');
    await fireEvent.press(screen.getByTestId('field-smoking-option-yes'));
    expect(onChange).toHaveBeenLastCalledWith('yes');
  });

  it('boutons radio obligatoires : l’option cochée le reste', async () => {
    const onChange = jest.fn();
    await show(<RadioField field={field('radio', true)} value="no" onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('field-smoking-option-no'));

    expect(onChange).toHaveBeenLastCalledWith('no');
  });
});

describe('la fenêtre de choix (décision 2026-11-27-select-images)', () => {
  it('un panneau à la hauteur de son contenu ; une option avec une image l’affiche devant son libellé', async () => {
    const definition = field('select', true);
    await show(
      <SelectField
        field={{ ...definition, options: [{ value: 'yes', label: 'Oui', image: 'https://example.test/studio.jpg' }, { value: 'no', label: 'Non' }] }}
        value="no"
        onChange={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByTestId('field-smoking'));
    expect(screen.getByTestId('field-smoking-options-header')).toHaveTextContent('Fumeurs acceptés');
    expect(StyleSheet.flatten(screen.getByTestId('field-smoking-options').props.style)).toMatchObject({ marginTop: 'auto', flexShrink: 1 });
    expect(screen.getByTestId('field-smoking-option-yes-image').props.source).toEqual([{ uri: 'https://example.test/studio.jpg' }]);
    expect(screen.queryByTestId('field-smoking-option-no-image')).toBeNull();
  });

  it('la recherche ne réduit pas le panneau : sa hauteur d’ouverture reste (décision 2026-11-27-select-hauteur-stable)', async () => {
    const definition = field('select', true);
    await show(<SelectField field={{ ...definition, searchable: true }} value="no" onChange={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('field-smoking'));
    await fireEvent(screen.getByTestId('field-smoking-options-body'), 'layout', { nativeEvent: { layout: { width: 400, height: 320 } } });
    await fireEvent.changeText(screen.getByTestId('field-smoking-search'), 'Ou');
    // Moins d'options : une hauteur mesurée plus petite ne la change pas.
    await fireEvent(screen.getByTestId('field-smoking-options-body'), 'layout', { nativeEvent: { layout: { width: 400, height: 120 } } });
    expect(screen.queryByTestId('field-smoking-option-no')).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('field-smoking-options-body').props.style)).toMatchObject({ minHeight: 320 });
  });

  it('au plus SEARCHABLE_LIMIT options à rechercher ; la limite servie par le champ la remplace (décision 2026-11-27-select-limite)', async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({ value: `v${index}`, label: `Option ${index}` }));
    const definition = { ...field('select', true), options: many, searchable: true };
    const { unmount } = await render(<I18nContext.Provider value={TEST_I18N}><SelectField field={definition} value="" onChange={jest.fn()} /></I18nContext.Provider>);
    await fireEvent.press(screen.getByTestId('field-smoking'));
    expect(screen.getAllByTestId(/^field-smoking-option-v\d+$/)).toHaveLength(SEARCHABLE_LIMIT);
    await unmount();

    await show(<SelectField field={{ ...definition, search_limit: 25 }} value="" onChange={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('field-smoking'));
    expect(screen.getAllByTestId(/^field-smoking-option-v\d+$/)).toHaveLength(25);
  });

  it('fermée : une flèche, sauf en lecture seule', async () => {
    await show(<SelectField field={field('select', true)} value="no" onChange={jest.fn()} />);
    expect(screen.getByTestId('field-smoking-chevron')).toBeTruthy();
  });

  it('en lecture seule : pas de flèche', async () => {
    await show(<SelectField field={{ ...field('select', true), readonly: true }} value="no" onChange={jest.fn()} />);
    expect(screen.queryByTestId('field-smoking-chevron')).toBeNull();
  });
});
