import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Accordion } from '../Accordion';

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

describe('Accordion (section repliable)', () => {
  it('ouverte par défaut ; le titre la replie puis la rouvre', async () => {
    await render(
      <Accordion title="Caractéristiques" testID="facts">
        <Text>Surface</Text>
      </Accordion>,
    );

    expect(screen.getByText('Caractéristiques')).toBeTruthy();
    expect(screen.getByText('Surface')).toBeTruthy();
    expect(screen.getByTestId('facts-toggle').props.accessibilityState).toEqual({ expanded: true });

    await fireEvent.press(screen.getByTestId('facts-toggle'));
    expect(screen.queryByText('Surface')).toBeNull();
    expect(screen.getByTestId('facts-toggle').props.accessibilityState).toEqual({ expanded: false });

    await fireEvent.press(screen.getByTestId('facts-toggle'));
    expect(screen.getByText('Surface')).toBeTruthy();
  });

  it('peut commencer fermée', async () => {
    await render(
      <Accordion title="Avis" initiallyOpen={false} testID="reviews">
        <Text>Paul</Text>
      </Accordion>,
    );

    expect(screen.queryByText('Paul')).toBeNull();
  });
});
