import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { CalendarDateField } from '../components/fields/CalendarDateField';
import type { FormFieldDefinition } from '../types';

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});

/** Champ de base : décembre 2026, du 1er au 31. */
function field(name: string, calendar: FormFieldDefinition['calendar']): FormFieldDefinition {
  return {
    name,
    type: 'date',
    label: name,
    placeholder: null,
    help: null,
    required: true,
    default: null,
    options: [],
    date_range: { min: '2026-12-01', max: '2026-12-31' },
    calendar,
  };
}

function Harness({ definition, afterValue, initial = '' }: { definition: FormFieldDefinition; afterValue?: string; initial?: string }) {
  const [value, setValue] = useState(initial);

  return <CalendarDateField field={definition} value={value} onChange={setValue} afterValue={afterValue} />;
}

async function show(definition: FormFieldDefinition, afterValue?: string, initial?: string) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <Harness definition={definition} afterValue={afterValue} initial={initial} />
    </I18nContext.Provider>,
  );
}

const disabled = (id: string) => screen.getByTestId(id).props.accessibilityState.disabled as boolean;

describe('CalendarDateField (décision 2026-11-19-contrat-calendrier-offre)', () => {
  it('une arrivée : les jours pris et hors bornes sont grisés ; choisir un jour le remplit et replie la grille', async () => {
    await show(field('check_in', { unavailable: ['2026-12-05', '2026-12-06'], after: null }));

    await fireEvent.press(screen.getByTestId('field-check_in'));
    // Dans un panneau titré du libellé du champ, pas sous le champ (décision 2026-11-26-calendrier-en-panneau).
    expect(screen.getByTestId('field-check_in-sheet-header')).toHaveTextContent('check_in');
    expect(screen.getByTestId('field-check_in-grid-label')).toHaveTextContent(/décembre 2026/i);
    expect(disabled('field-check_in-grid-day-2026-12-05')).toBe(true);
    expect(disabled('field-check_in-grid-day-2026-12-04')).toBe(false);
    expect(screen.queryByTestId('field-check_in-grid-previous')?.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('field-check_in-grid-day-2026-12-04'));
    expect(screen.queryByTestId('field-check_in-grid')).toBeNull();
    expect(screen.getByTestId('field-check_in')).toHaveTextContent('4 décembre 2026');
  });

  it('un départ : après l’arrivée et au plus tard le premier jour pris qui la suit', async () => {
    await show(field('check_out', { unavailable: ['2026-12-08', '2026-12-09'], after: 'check_in' }), '2026-12-04', '2026-12-06');

    await fireEvent.press(screen.getByTestId('field-check_out'));
    expect(disabled('field-check_out-grid-day-2026-12-04')).toBe(true);
    expect(disabled('field-check_out-grid-day-2026-12-05')).toBe(false);
    // Le 8 est une nuit prise : on peut partir ce matin-là, pas après.
    expect(disabled('field-check_out-grid-day-2026-12-08')).toBe(false);
    expect(disabled('field-check_out-grid-day-2026-12-09')).toBe(true);
    // L'arrivée et le départ choisis, la période entre les deux surlignée.
    expect(screen.getByTestId('field-check_out-grid-day-2026-12-04').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('field-check_out-grid-day-2026-12-06').props.accessibilityState.selected).toBe(true);
  });

  it('un départ sans arrivée : rien n’est choisissable, une aide le dit', async () => {
    await show(field('check_out', { unavailable: [], after: 'check_in' }), '');

    await fireEvent.press(screen.getByTestId('field-check_out'));
    expect(screen.getByTestId('field-check_out-hint')).toHaveTextContent("Choisissez d'abord l'arrivée.");
    expect(disabled('field-check_out-grid-day-2026-12-10')).toBe(true);
  });
});
