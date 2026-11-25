import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Colors } from '@/shared/theme/theme';
import { TEST_I18N } from '@/shared/i18n/test-messages';
import { I18nContext } from '@/shared/i18n/I18nContext';

import { FormField } from '../components/FormField';
import type { FormFieldDefinition } from '../types';

// Le champ texte peut appeler l'API (suggestions) : son adresse de test.
jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function field(): FormFieldDefinition {
  return { name: 'rating', type: 'rating', label: 'Note', placeholder: null, help: null, required: true, default: null, options: [] };
}

async function show(value: string, onChange = jest.fn()) {
  await render(
    <I18nContext.Provider value={TEST_I18N}>
      <FormField field={field()} value={value} onChange={onChange} />
    </I18nContext.Provider>,
  );

  return onChange;
}


describe('RatingField (type « rating »)', () => {
  it('cinq étoiles, lues « n sur 5 » ; toucher la 4ᵉ donne « 4 »', async () => {
    const onChange = await show('');

    expect(screen.getByTestId('field-rating-star-1').props.accessibilityLabel).toBe('1 sur 5');
    expect(screen.getByTestId('field-rating-star-5').props.accessibilityLabel).toBe('5 sur 5');
    await fireEvent.press(screen.getByTestId('field-rating-star-4'));

    expect(onChange).toHaveBeenCalledWith('4');
  });

  it('la note choisie : ses étoiles pleines, et elle seule sélectionnée', async () => {
    await show('3');

    expect(screen.getByTestId('field-rating-star-3').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(screen.getByTestId('field-rating-star-4').props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getAllByText('★').map((star) => StyleSheet.flatten(star.props.style).color).filter((c) => c === Colors.light.text)).toHaveLength(3);
  });
});
