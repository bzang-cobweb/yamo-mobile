import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { ConnectivityGate } from '../ConnectivityGate';

/** Un écran avec un état local, pour vérifier qu'il survit à une coupure. */
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <Pressable testID="counter" onPress={() => setCount((value) => value + 1)}>
      <Text>{`compteur ${count}`}</Text>
    </Pressable>
  );
}

function renderGate(offline: boolean) {
  return (
    <ConnectivityGate offline={offline} onRetry={jest.fn()} retrying={false}>
      <Counter />
    </ConnectivityGate>
  );
}

describe('ConnectivityGate', () => {
  it("en ligne : affiche l'écran courant, sans écran hors ligne", async () => {
    await render(renderGate(false));

    expect(screen.queryByTestId('offline-message')).toBeNull();
    expect(screen.getByText('compteur 0')).toBeVisible();
  });

  it("hors ligne : l'écran hors ligne recouvre l'app, cachée et inerte", async () => {
    await render(renderGate(true));

    expect(screen.getByTestId('offline-message')).toBeTruthy();
    // Cachée aux lecteurs d'écran : introuvable par défaut, présente si on inclut les éléments cachés.
    expect(screen.queryByTestId('connectivity-content')).toBeNull();
    const content = screen.getByTestId('connectivity-content', { includeHiddenElements: true });
    expect(content).toHaveProp('pointerEvents', 'none');
    expect(content).toHaveProp('accessibilityElementsHidden', true);
  });

  it("au retour d'internet, l'écran courant revient dans l'état où il était", async () => {
    const view = await render(renderGate(false));
    await fireEvent.press(screen.getByTestId('counter'));
    await fireEvent.press(screen.getByTestId('counter'));

    await view.rerender(renderGate(true));
    await view.rerender(renderGate(false));

    expect(screen.queryByTestId('offline-message')).toBeNull();
    expect(screen.getByText('compteur 2')).toBeTruthy();
  });
});
