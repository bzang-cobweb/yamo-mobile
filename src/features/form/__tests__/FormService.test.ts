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

describe('FormService.get : paramètres de rechargement', () => {
  it('ajoute record et les valeurs des champs qui rechargent', async () => {
    const client = { get: jest.fn().mockResolvedValue({ data: {} }) };
    const service = new FormService(client as unknown as ApiClient);

    await service.get('offer.offer', '12', { content_locale: 'de' });

    expect(client.get).toHaveBeenCalledWith('/v1/forms/offer.offer?record=12&content_locale=de');
  });
});

describe('FormService.validateStep : enregistrement', () => {
  it('envoie record avec la validation d’une étape', async () => {
    const client = { post: jest.fn().mockResolvedValue(undefined) };
    const service = new FormService(client as unknown as ApiClient);

    await service.validateStep('offer.offer', 1, { content_locale: 'de' }, '22');

    expect(client.post).toHaveBeenCalledWith('/v1/forms/offer.offer/steps/1?record=22', { content_locale: 'de' });
  });
});
