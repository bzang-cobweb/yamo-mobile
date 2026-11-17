import type { ApiClient } from '@/shared/api/ApiClient';

import { FormService } from '../services/FormService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

describe('FormService.get', () => {
  const definition = { name: 'location.address' };

  function service() {
    const client = { get: jest.fn().mockResolvedValue({ data: definition }) };

    return { client, forms: new FormService(client as unknown as ApiClient) };
  }

  it('demande la définition du formulaire', async () => {
    const { client, forms } = service();

    await expect(forms.get('location.address')).resolves.toBe(definition);
    expect(client.get).toHaveBeenCalledWith('/v1/forms/location.address');
  });

  it('lié à un enregistrement : `?record=`, encodé', async () => {
    const { client, forms } = service();

    await forms.get('location.address', '12&x=1');

    expect(client.get).toHaveBeenCalledWith('/v1/forms/location.address?record=12%26x%3D1');
  });
});
