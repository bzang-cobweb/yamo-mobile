import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Colors, Spacing } from '@/shared/theme/theme';

import { SheetBar } from '../SheetBar';

describe('SheetBar (décision 2026-11-26-sheet-bar)', () => {
  it('bordée en haut, sur le fond du thème ; en colonne par défaut', async () => {
    await render(
      <SheetBar testID="bar">
        <Text>Note</Text>
      </SheetBar>,
    );

    const style = StyleSheet.flatten(screen.getByTestId('bar').props.style);
    expect(style).toMatchObject({ borderTopWidth: 1, borderTopColor: Colors.light.backgroundSelected, backgroundColor: Colors.light.background });
    expect(style).toMatchObject({ paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, gap: Spacing.three });
    expect(style.flexDirection).toBeUndefined();
  });

  it('`row` : sur une ligne, aux deux bouts', async () => {
    await render(
      <SheetBar row testID="bar">
        <Text>Effacer</Text>
        <Text>Appliquer</Text>
      </SheetBar>,
    );

    expect(StyleSheet.flatten(screen.getByTestId('bar').props.style)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' });
  });
});
