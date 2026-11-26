import { fireEvent, render, screen } from '@testing-library/react-native';

import { I18nContext } from '@/shared/i18n/I18nContext';
import { TEST_I18N } from '@/shared/i18n/test-messages';

import { DateField } from '../components/fields/DateField';
import type { FormFieldDefinition } from '../types';

type MockPickerProps = { onChange: (event: { type: string }, date?: Date) => void; testID?: string; minimumDate?: Date; maximumDate?: Date; value?: Date };

/** Les bornes reçues par le dernier calendrier affiché. */
let mockBounds: { minimumDate?: Date; maximumDate?: Date; value?: Date } = {};

/** Le sélecteur natif est remplacé par un bouton qui choisit le 12 avril 1990. */
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');

  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) };
});
jest.mock('@react-native-community/datetimepicker', () => {
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const Picker = ({ onChange, testID, minimumDate, maximumDate, value }: MockPickerProps) => {
    mockBounds = { minimumDate, maximumDate, value };

    return (
      <Pressable testID={testID} onPress={() => onChange({ type: 'set' }, new Date(1990, 3, 12))}>
        <Text>calendrier</Text>
      </Pressable>
    );
  };

  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

const birthDate: FormFieldDefinition = {
  name: 'birth_date',
  type: 'date',
  label: 'Date de naissance',
  placeholder: null,
  help: null,
  required: false,
  default: null,
  options: [],
};

async function renderField(value: string, onChange = jest.fn(), field = birthDate) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <DateField field={field} value={value} onChange={onChange} />
    </I18nContext.Provider>,
  );

  return onChange;
}

describe('DateField', () => {
  it('vide : affiche « Choisir… », sans bouton Effacer', async () => {
    await renderField('');

    expect(screen.getByTestId('field-birth_date')).toHaveTextContent('Choisir…');
    expect(screen.queryByTestId('field-birth_date-clear')).toBeNull();
  });

  it('remplie : affiche la date dans la langue de l’app', async () => {
    await renderField('1990-04-12');

    expect(screen.getByTestId('field-birth_date')).toHaveTextContent('12 avril 1990');
  });

  it('le format servi par l’API est appliqué, sans nouvelle version de l’app (décision 2026-11-25-dates-formatees-serveur)', async () => {
    await renderField('1990-04-12', jest.fn(), { ...birthDate, date_formats: { value: { month: 'short', year: 'numeric' } } });

    expect(screen.getByTestId('field-birth_date')).toHaveTextContent(new Intl.DateTimeFormat('fr', { month: 'short', year: 'numeric' }).format(new Date(1990, 3, 12)));
  });

  it('ouvre le calendrier et renvoie la date choisie au format AAAA-MM-JJ', async () => {
    const onChange = await renderField('');

    await fireEvent.press(screen.getByTestId('field-birth_date'));
    await fireEvent.press(screen.getByTestId('field-birth_date-picker'));

    expect(onChange).toHaveBeenCalledWith('1990-04-12');
  });

  it('facultative : « Effacer » vide la valeur ; obligatoire : pas de bouton Effacer', async () => {
    const onChange = await renderField('1990-04-12');

    await fireEvent.press(screen.getByTestId('field-birth_date-clear'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it("obligatoire : pas de bouton Effacer", async () => {
    await renderField('1990-04-12', jest.fn(), { ...birthDate, required: true });

    expect(screen.queryByTestId('field-birth_date-clear')).toBeNull();
  });

  it('le calendrier suit les bornes servies ; sans bornes, toute date (décision 2026-11-19-bornes-des-dates)', async () => {
    await renderField('', jest.fn(), { ...birthDate, name: 'check_in', date_range: { min: '2030-01-10', max: '2031-01-10' } });
    await fireEvent.press(screen.getByTestId('field-check_in'));
    expect(mockBounds.minimumDate).toEqual(new Date(2030, 0, 10));
    expect(mockBounds.maximumDate).toEqual(new Date(2031, 0, 10));
    // Ouvert sur la première date possible quand aujourd'hui est avant.
    expect(mockBounds.value).toEqual(new Date(2030, 0, 10));

    await renderField('', jest.fn(), { ...birthDate, name: 'available_from' });
    await fireEvent.press(screen.getByTestId('field-available_from'));
    expect(mockBounds.minimumDate).toBeUndefined();
    expect(mockBounds.maximumDate).toBeUndefined();
  });
});
