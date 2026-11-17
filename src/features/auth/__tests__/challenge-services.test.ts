import type { ApiClient } from '@/shared/api/ApiClient';

import { LoginService } from '../services/LoginService';
import { PasswordResetService } from '../services/PasswordResetService';
import { RegisterService } from '../services/RegisterService';
import { VerificationService } from '../services/VerificationService';
import type { Challenge } from '../types';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

const challenge: Challenge = { challenge: 'abc', channel: 'email', destination: 'j•••@example.com' };

function client(response: unknown) {
  return { post: jest.fn().mockResolvedValue(response) };
}

describe('services des opérations vérifiées par code (une méthode par appel)', () => {
  it.each([
    ['LoginService.login', '/v1/auth/login', (c: ApiClient) => new LoginService(c).login({ channel: 'email', email: 'a@b.c', password: 'x' })],
    ['RegisterService.register', '/v1/auth/register', (c: ApiClient) => new RegisterService(c).register({ name: 'marie' })],
    ['PasswordResetService.forgot', '/v1/auth/password/forgot', (c: ApiClient) => new PasswordResetService(c).forgot({ channel: 'email', email: 'a@b.c' })],
  ])('%s : POST %s, renvoie le défi', async (_name, path, call) => {
    const fake = client(challenge);

    await expect(call(fake as unknown as ApiClient)).resolves.toBe(challenge);
    expect(fake.post).toHaveBeenCalledWith(path, expect.any(Object));
  });

  it('VerificationService.verify : envoie défi, canal, code et appareil', async () => {
    const fake = client({ data: { id: 1 } });

    await new VerificationService(fake as unknown as ApiClient).verify(challenge, '123456', 'iPhone');

    expect(fake.post).toHaveBeenCalledWith('/v1/auth/codes/verify', {
      challenge: 'abc',
      channel: 'email',
      code: '123456',
      device_name: 'iPhone',
    });
  });

  it('VerificationService.verify : distingue code suivant, session et compte modifié', async () => {
    const next = { challenge: 'abc', channel: 'sms', destination: '+41 ••• 67' };
    const verify = (response: unknown) => new VerificationService(client(response) as unknown as ApiClient).verify(challenge, '1', 'x');

    await expect(verify(next)).resolves.toEqual({ kind: 'pending', challenge: next });
    await expect(verify({ data: { id: 1 }, token: 't' })).resolves.toEqual({ kind: 'session', session: { user: { id: 1 }, token: 't' } });
    await expect(verify({ data: { id: 1 } })).resolves.toEqual({ kind: 'user', user: { id: 1 } });
    await expect(verify({ next: 'password', challenge: 'abc' })).resolves.toEqual({ kind: 'password', challenge: 'abc' });
    await expect(verify({ next: 'restore', challenge: 'abc', deletion_date: '2026-12-20' })).resolves.toEqual({
      kind: 'restore',
      challenge: 'abc',
      deletionDate: '2026-12-20',
    });
  });

  it('PasswordResetService.reset : POST /v1/auth/password/reset avec le défi', async () => {
    const fake = client(undefined);

    await new PasswordResetService(fake as unknown as ApiClient).reset('abc', { password: 'x', password_confirmation: 'x' });

    expect(fake.post).toHaveBeenCalledWith('/v1/auth/password/reset', { password: 'x', password_confirmation: 'x', challenge: 'abc' });
  });

  it('VerificationService.resend : POST /v1/auth/codes/resend', async () => {
    const fake = client(undefined);

    await new VerificationService(fake as unknown as ApiClient).resend(challenge);

    expect(fake.post).toHaveBeenCalledWith('/v1/auth/codes/resend', { challenge: 'abc' });
  });
});
