import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { currentToast, hideToast, showToast, TOAST_DURATION, ToastHost } from '../Toast';

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 40, right: 0, bottom: 0, left: 0 }) }));

describe('Toast, le bandeau des messages qui suivent une action (décision 2026-11-21-bandeau-messages)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    hideToast();
  });
  afterEach(() => jest.useRealTimers());

  it('affiche le message sous la barre du haut, l’annonce, puis disparaît après sa durée', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    await render(<ToastHost />);
    expect(screen.queryByTestId('toast-message')).toBeNull();

    await act(async () => showToast('Demande envoyée.'));
    expect(screen.getByTestId('toast-message')).toHaveTextContent('Demande envoyée.');
    expect(screen.getByTestId('toast-success')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('Demande envoyée.');

    await act(async () => jest.advanceTimersByTime(TOAST_DURATION));
    expect(screen.queryByTestId('toast-message')).toBeNull();
    expect(currentToast()).toBeNull();
  });

  it('une erreur en rouge ; un toucher la ferme ; un nouveau message remplace l’ancien', async () => {
    await render(<ToastHost announce={false} />);

    await act(async () => showToast('Premier.'));
    await act(async () => showToast('Ces dates chevauchent.', 'danger'));
    expect(screen.getByTestId('toast-message')).toHaveTextContent('Ces dates chevauchent.');
    expect(StyleSheet.flatten(screen.getByTestId('toast-danger').props.style).backgroundColor).toBeDefined();

    await act(async () => fireEvent.press(screen.getByTestId('toast-danger')));
    expect(screen.queryByTestId('toast-message')).toBeNull();
  });
});
