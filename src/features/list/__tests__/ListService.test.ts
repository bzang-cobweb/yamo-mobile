import type { ApiClient } from '@/shared/api/ApiClient';

import { ListService } from '../services/ListService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

describe('ListService.get', () => {
  it('demande la liste par son nom, encodé', async () => {
    const list = { name: 'location.addresses', items: [] };
    const client = { get: jest.fn().mockResolvedValue({ data: list }) };

    await expect(new ListService(client as unknown as ApiClient).get('location.addresses')).resolves.toBe(list);
    expect(client.get).toHaveBeenCalledWith('/v1/lists/location.addresses');
  });

  it('demande la page qui suit le curseur, encodé', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: { items: [] } }) };

    await new ListService(client as unknown as ApiClient).get('location.addresses', 'eyJpZCI6MjB9+/=');
    expect(client.get).toHaveBeenCalledWith('/v1/lists/location.addresses?cursor=eyJpZCI6MjB9%2B%2F%3D');
  });
});
