import type { ApiClient } from '@/shared/api/ApiClient';

import { FormService } from '../services/FormService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

describe('FormService.get', () => {
  const definition = { name: 'auth.address' };

  function service() {
    const client = { get: jest.fn().mockResolvedValue({ data: definition }) };

    return { client, forms: new FormService(client as unknown as ApiClient) };
  }

  it('demande la définition du formulaire', async () => {
    const { client, forms } = service();

    await expect(forms.get('auth.address')).resolves.toBe(definition);
    expect(client.get).toHaveBeenCalledWith('/v1/forms/auth.address');
  });

  it('lié à un enregistrement : `?record=`, encodé', async () => {
    const { client, forms } = service();

    await forms.get('auth.address', '12&x=1');

    expect(client.get).toHaveBeenCalledWith('/v1/forms/auth.address?record=12%26x%3D1');
  });
});
