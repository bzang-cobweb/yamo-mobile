import type { ApiClient } from '@/shared/api/ApiClient';

import { LoginService } from '../services/LoginService';
import { RegisterService } from '../services/RegisterService';
import { SessionService } from '../services/SessionService';
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
    await expect(verify({ next: 'password', challenge: 'abc', mode: 'create' })).resolves.toEqual({ kind: 'password', challenge: 'abc', mode: 'create' });
    // Sans mode : le mot de passe du compte.
    await expect(verify({ next: 'password', challenge: 'abc' })).resolves.toEqual({ kind: 'password', challenge: 'abc', mode: 'sign-in' });
    await expect(verify({ next: 'restore', challenge: 'abc', deletion_date: '2026-12-20' })).resolves.toEqual({
      kind: 'restore',
      challenge: 'abc',
      deletionDate: '2026-12-20',
    });
  });

  it('SessionService.open : POST /v1/auth/session (défi, mot de passe, reset, appareil) → connecté ou inscription', async () => {
    const signedIn = client({ data: { id: 1 }, token: 't' });

    await expect(new SessionService(signedIn as unknown as ApiClient).open('abc', { password: 'secret' }, false, 'iPhone')).resolves.toEqual({
      kind: 'session',
      session: { user: { id: 1 }, token: 't' },
    });
    expect(signedIn.post).toHaveBeenCalledWith('/v1/auth/session', { challenge: 'abc', password: 'secret', device_name: 'iPhone' });

    const register = client({ next: 'register', challenge: 'abc' });
    await expect(
      new SessionService(register as unknown as ApiClient).open('abc', { password: 'secret', password_confirmation: 'secret' }, true, 'iPhone'),
    ).resolves.toEqual({ kind: 'register', challenge: 'abc' });
    expect(register.post).toHaveBeenCalledWith('/v1/auth/session', {
      challenge: 'abc',
      password: 'secret',
      password_confirmation: 'secret',
      reset: true,
      device_name: 'iPhone',
    });
  });

  it('RegisterService.register : POST /v1/auth/register avec le défi et l’appareil → la session (201)', async () => {
    const fake = client({ data: { id: 2 }, token: 'u' });

    await expect(new RegisterService(fake as unknown as ApiClient).register('abc', { first_name: 'Awa', last_name: 'Diallo', phone: '' }, 'iPhone')).resolves.toEqual({
      user: { id: 2 },
      token: 'u',
    });
    expect(fake.post).toHaveBeenCalledWith('/v1/auth/register', { challenge: 'abc', first_name: 'Awa', last_name: 'Diallo', phone: '', device_name: 'iPhone' });
  });

  it('VerificationService.resend : POST /v1/auth/codes/resend', async () => {
    const fake = client(undefined);

    await new VerificationService(fake as unknown as ApiClient).resend(challenge);

    expect(fake.post).toHaveBeenCalledWith('/v1/auth/codes/resend', { challenge: 'abc' });
  });
});
