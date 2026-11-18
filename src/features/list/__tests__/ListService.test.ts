import type { ApiClient } from '@/shared/api/ApiClient';

import { ListService } from '../services/ListService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

describe('ListService.get', () => {
  it('demande la liste par son nom, encodé', async () => {
    const list = { name: 'auth.addresses', items: [] };
    const client = { get: jest.fn().mockResolvedValue({ data: list }) };

    await expect(new ListService(client as unknown as ApiClient).get('auth.addresses')).resolves.toBe(list);
    expect(client.get).toHaveBeenCalledWith('/v1/lists/auth.addresses');
  });

  it('demande la page qui suit le curseur, encodé', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: { items: [] } }) };

    await new ListService(client as unknown as ApiClient).get('auth.addresses', 'eyJpZCI6MjB9+/=');
    expect(client.get).toHaveBeenCalledWith('/v1/lists/auth.addresses?cursor=eyJpZCI6MjB9%2B%2F%3D');
  });

  it('ajoute la recherche, nettoyée et encodée, au curseur', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: { items: [] } }) };
    const service = new ListService(client as unknown as ApiClient);

    await service.get('auth.addresses', 'c2', ' Genève & co ');
    expect(client.get).toHaveBeenLastCalledWith('/v1/lists/auth.addresses?cursor=c2&search=Gen%C3%A8ve%20%26%20co');

    await service.get('auth.addresses', null, '   ');
    expect(client.get).toHaveBeenLastCalledWith('/v1/lists/auth.addresses');
  });
});
