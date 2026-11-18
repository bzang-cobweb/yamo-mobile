import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { useListDefinition } from '../hooks/useListDefinition';
import type { ListDefinition } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

const mockGet = jest.fn();
jest.mock('../services/ListService', () => ({ listService: { get: (...args: unknown[]) => mockGet(...args) } }));

function page(ids: string[], next: string | null, title = 'Mes adresses'): ListDefinition {
  return {
    name: 'location.addresses',
    title,
    empty: null,
    create: null,
    search: null,
    next_cursor: next,
    items: ids.map((id) => ({ id, title: id, subtitle: null, edit: null, delete: null })),
  };
}

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useListDefinition (pages suivies par curseur)', () => {
  beforeEach(() => mockGet.mockReset());

  it('met les items des pages bout à bout, sous la première page', async () => {
    mockGet.mockImplementation(async (_name: string, cursor: string | null) =>
      cursor === 'c2' ? page(['3'], null, 'ignoré') : page(['1', '2'], 'c2'),
    );
    const { result } = await renderHook(() => useListDefinition('location.addresses'), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockGet).toHaveBeenLastCalledWith('location.addresses', 'c2', '');
    expect(result.current.data?.title).toBe('Mes adresses');
    await waitFor(() => expect(result.current.data?.items.map((item) => item.id)).toEqual(['1', '2', '3']));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('reload repart de la première page, en une requête', async () => {
    mockGet.mockImplementation(async (_name: string, cursor: string | null) => (cursor === 'c2' ? page(['3'], null) : page(['1', '2'], 'c2')));
    const { result } = await renderHook(() => useListDefinition('location.addresses'), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(3));

    mockGet.mockClear();
    mockGet.mockResolvedValue(page(['2'], 'c3'));
    await act(async () => {
      await result.current.reload();
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('location.addresses', null, '');
    await waitFor(() => expect(result.current.data?.items.map((item) => item.id)).toEqual(['2']));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('une recherche demande la liste restreinte, en gardant les items affichés pendant le chargement', async () => {
    let finish: (value: ListDefinition) => void = () => undefined;
    mockGet.mockImplementation(async (_name: string, _cursor: string | null, search: string) =>
      search === 'lac' ? new Promise<ListDefinition>((resolve) => (finish = resolve)) : page(['1', '2'], null),
    );
    const { result, rerender } = await renderHook(({ search }: { search: string }) => useListDefinition('location.addresses', search), {
      wrapper,
      initialProps: { search: '' },
    });
    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));

    await rerender({ search: ' lac ' });

    expect(mockGet).toHaveBeenLastCalledWith('location.addresses', null, 'lac');
    expect(result.current.isPending).toBe(false);
    expect(result.current.data?.items.map((item) => item.id)).toEqual(['1', '2']);

    await act(async () => finish(page(['2'], null)));
    await waitFor(() => expect(result.current.data?.items.map((item) => item.id)).toEqual(['2']));
  });
});
