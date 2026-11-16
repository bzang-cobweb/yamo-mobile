import type { ApiClient } from '@/shared/api/ApiClient';

import { PasswordService } from '../services/PasswordService';
import { PersonalInfoService } from '../services/PersonalInfoService';
import { PreferencesService } from '../services/PreferencesService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function fakeClient() {
  const user = { id: 1 };

  return {
    patch: jest.fn().mockResolvedValue({ data: user }),
    put: jest.fn().mockResolvedValue(undefined),
    user,
  };
}

describe('services des formulaires du profil (une méthode par appel)', () => {
  it('PersonalInfoService.update : PATCH /v1/auth/me/personal-info, renvoie le compte', async () => {
    const client = fakeClient();
    const values = { first_name: 'Jeanne', last_name: 'Dupont' };

    await expect(new PersonalInfoService(client as unknown as ApiClient).update(values)).resolves.toBe(client.user);
    expect(client.patch).toHaveBeenCalledWith('/v1/auth/me/personal-info', values);
  });

  it('PasswordService.update : PUT /v1/auth/me/password', async () => {
    const client = fakeClient();
    const values = { current_password: 'a', password: 'b', password_confirmation: 'b' };

    await new PasswordService(client as unknown as ApiClient).update(values);
    expect(client.put).toHaveBeenCalledWith('/v1/auth/me/password', values);
  });

  it('PreferencesService.update : PATCH /v1/auth/me/preferences, renvoie le compte', async () => {
    const client = fakeClient();

    await expect(new PreferencesService(client as unknown as ApiClient).update({ locale: 'en' })).resolves.toBe(client.user);
    expect(client.patch).toHaveBeenCalledWith('/v1/auth/me/preferences', { locale: 'en' });
  });
});
