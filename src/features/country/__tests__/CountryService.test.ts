import type { ApiClient } from '@/shared/api/ApiClient';

import { CountryService } from '../services/CountryService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

describe('CountryService.list', () => {
  it('demande les pays ouverts', async () => {
    const countries = [{ code: 'CM', name: 'Cameroun', native_name: 'Cameroun', flag: '🇨🇲', currency: 'XAF', dial_code: '+237' }];
    const client = { get: jest.fn().mockResolvedValue({ data: countries }) };

    await expect(new CountryService(client as unknown as ApiClient).list()).resolves.toBe(countries);
    expect(client.get).toHaveBeenCalledWith('/v1/countries');
  });
});
