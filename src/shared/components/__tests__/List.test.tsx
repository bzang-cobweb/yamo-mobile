import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { List } from '../List';

type Fruit = { code: string; name: string };

const FRUITS: Fruit[] = [
  { code: 'a', name: 'Abricot' },
  { code: 'b', name: 'Banane' },
];

async function renderList(props: Partial<Parameters<typeof List<Fruit>>[0]> = {}) {
  await render(
    <List<Fruit>
      testID="fruits"
      items={FRUITS}
      keyExtractor={(fruit) => fruit.code}
      renderItem={(fruit) => <Text>{fruit.name}</Text>}
      {...props}
    />,
  );
}

/** FlatList signale qu'on approche du bas. */
async function reachEnd() {
  await act(async () => {
    fireEvent(screen.getByTestId('fruits'), 'onEndReached', { distanceFromEnd: 10 });
  });
}

describe('List (données locales, sans API)', () => {
  it('affiche les items, l’en-tête, et rien de vide', async () => {
    await renderList({ header: <Text>Mes fruits</Text>, empty: 'Aucun fruit.' });

    expect(screen.getByText('Mes fruits')).toBeTruthy();
    expect(screen.getByText('Abricot')).toBeTruthy();
    expect(screen.getByText('Banane')).toBeTruthy();
    expect(screen.queryByTestId('fruits-empty')).toBeNull();
  });

  it('vide : affiche le texte donné', async () => {
    await renderList({ items: [], empty: 'Aucun fruit.' });

    expect(screen.getByTestId('fruits-empty').props.children).toBe('Aucun fruit.');
  });

  it('en approchant du bas, demande la suite une seule fois à la fois', async () => {
    let finish: () => void = () => undefined;
    const onLoadMore = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    await renderList({ hasMore: true, onLoadMore });

    await reachEnd();
    await reachEnd();
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await reachEnd();
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('ne demande rien quand il n’y a plus rien, ou pendant un chargement', async () => {
    const onLoadMore = jest.fn();
    await renderList({ hasMore: false, onLoadMore });
    await reachEnd();

    await renderList({ hasMore: true, loadingMore: true, onLoadMore, loadingMoreLabel: 'Chargement…' });
    await reachEnd();

    expect(onLoadMore).not.toHaveBeenCalled();
    expect(screen.getByTestId('fruits-loading-more').props.accessibilityLabel).toBe('Chargement…');
  });

  it('un chargement en échec n’empêche pas de redemander la suite', async () => {
    const onLoadMore = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    await renderList({ hasMore: true, onLoadMore });

    await reachEnd();
    await reachEnd();

    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('tirer vers le bas recharge', async () => {
    const onRefresh = jest.fn();
    await renderList({ onRefresh, refreshing: false });

    await act(async () => {
      fireEvent(screen.getByTestId('fruits'), 'onRefresh');
    });

    expect(onRefresh).toHaveBeenCalled();
  });
});
