import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { RepeaterField } from '../components/fields/RepeaterField';
import type { FormFieldDefinition, RepeaterItem } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

const subField = (name: string, type: FormFieldDefinition['type'], label: string | null): FormFieldDefinition => ({
  name,
  type,
  label,
  placeholder: null,
  help: null,
  required: type !== 'hidden',
  default: null,
  options: [],
});

const FIELD: FormFieldDefinition = {
  ...subField('informations', 'repeater', 'Informations'),
  required: false,
  repeater: {
    fields: [subField('id', 'hidden', null), subField('title', 'text', 'Titre'), subField('description', 'textarea', 'Description')],
    max_items: 2,
    add_label: 'Ajouter une information',
  },
};

async function renderField(value: RepeaterItem[], errors = {}) {
  const onChange = jest.fn();
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <RepeaterField field={FIELD} value={value} onChange={onChange} errors={errors} />
    </I18nContext.Provider>,
  );

  return onChange;
}

describe('RepeaterField (liste de groupes décrite par Laravel)', () => {
  it('ajoute un groupe vide, avec le libellé servi', async () => {
    const onChange = await renderField([]);

    await fireEvent.press(screen.getByText('+ Ajouter une information'));

    expect(onChange).toHaveBeenCalledWith([{ id: '', title: '', description: '' }]);
  });

  it('modifie un sous-champ, en retire un groupe, garde l’identifiant caché', async () => {
    const items = [{ id: '4', title: 'Arrivée', description: 'Clés.' }, { id: '', title: 'Parking', description: 'Cour.' }];
    const onChange = await renderField(items);

    // Fermés par défaut, titrés par leur titre (décision 2026-11-19-repeater-accordeon).
    expect(screen.getByText('Arrivée')).toBeTruthy();
    expect(screen.getByTestId('field-informations-item-0-toggle').props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByTestId('field-informations.0.title')).toBeNull();
    // Supprimer : une icône sur le titre, visible fermé ; plus de lien dans le bloc (décision 2026-11-19-repeater-icone-supprimer).
    expect(screen.getByTestId('field-informations-remove-0').props.accessibilityLabel).toBe('Retirer ce bloc');
    expect(screen.queryByText('Retirer ce bloc')).toBeNull();
    await fireEvent.press(screen.getByTestId('field-informations-item-0-toggle'));
    await fireEvent.press(screen.getByTestId('field-informations-item-1-toggle'));
    // L'identifiant n'est pas affiché.
    expect(screen.queryByTestId('field-informations.0.id')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('field-informations.0.title'), 'Arrivée tardive');
    expect(onChange).toHaveBeenLastCalledWith([{ id: '4', title: 'Arrivée tardive', description: 'Clés.' }, items[1]]);

    await fireEvent.press(screen.getByTestId('field-informations-remove-1'));
    expect(onChange).toHaveBeenLastCalledWith([items[0]]);
    // Le maximum (2) est atteint : pas de bouton d'ajout.
    expect(screen.queryByTestId('field-informations-add')).toBeNull();
  });

  it('un groupe sans titre s’appelle « Sans titre » ; un groupe en erreur est ouvert', async () => {
    await renderField([{ id: '', title: '  ', description: 'x' }]);
    expect(screen.getByText('Sans titre')).toBeTruthy();
    expect(screen.getByTestId('field-informations-item-0-toggle').props.accessibilityState).toEqual({ expanded: false });
  });

  it('affiche l’erreur d’un sous-champ sous lui, groupe ouvert', async () => {
    await renderField([{ id: '', title: '', description: 'x' }], { 'informations.0.title': ['Le champ titre est obligatoire.'] });

    expect(screen.getByText('Le champ titre est obligatoire.')).toBeTruthy();
  });
});
