import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Stars } from '../Stars';

describe('Stars (décision 2026-11-27-note-au-dixieme)', () => {
  it('les étoiles pleines coupées à la note, au dixième : 3,2 sur 5 couvre 64 % de la largeur', async () => {
    await render(<Stars value={3.2} emptyColor="#ccc" testID="stars" />);
    const empty = screen.getAllByText('★★★★★')[0];

    await fireEvent(empty, 'layout', { nativeEvent: { layout: { width: 100, height: 20, x: 0, y: 0 } } });

    const full = screen.getByTestId('stars-full');
    expect(StyleSheet.flatten(full.props.style)).toMatchObject({ width: 100 });
    expect(StyleSheet.flatten(full.parent?.props.style)).toMatchObject({ width: 64, overflow: 'hidden' });
  });

  it('bornée de 0 à 5', async () => {
    await render(<Stars value={7} emptyColor="#ccc" testID="stars" />);
    await fireEvent(screen.getAllByText('★★★★★')[0], 'layout', { nativeEvent: { layout: { width: 100, height: 20, x: 0, y: 0 } } });

    expect(StyleSheet.flatten(screen.getByTestId('stars-full').parent?.props.style)).toMatchObject({ width: 100 });
  });
});
