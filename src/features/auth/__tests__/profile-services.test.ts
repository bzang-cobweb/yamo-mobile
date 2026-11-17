import type { ApiClient } from '@/shared/api/ApiClient';

import { ProfileFormService, profileSubmission, type ProfileSubmission } from '../services/ProfileFormService';
import { ProfileMenuService } from '../services/ProfileMenuService';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

const success = { action: 'profile', message: 'Modifications enregistrées.' };

describe('profileSubmission : envoi décrit par l’API, s’il est exécutable', () => {
  it('garde méthode, point d’API relatif et suite connus', () => {
    expect(profileSubmission({ label: 'OK', method: 'PATCH', endpoint: '/v1/auth/me/personal-info', success })).toEqual({
      method: 'PATCH',
      endpoint: '/v1/auth/me/personal-info',
      success,
    });
    expect(profileSubmission({ label: 'OK', method: 'DELETE', endpoint: '/v1/auth/me', destructive: true, success: { action: 'sign-out', message: 'Supprimé.' } })).not.toBeNull();
    // Retrait d'un item d'une liste : pas de libellé de bouton d'envoi, suite « back ».
    expect(profileSubmission({ method: 'DELETE', endpoint: '/v1/auth/me/addresses/12', success: { action: 'back', message: 'Adresse retirée.' } })).not.toBeNull();
  });

  it.each([
    ['sans envoi décrit', { label: 'OK' }],
    ['adresse absolue', { label: 'OK', method: 'POST', endpoint: 'https://example.test/v1/x', success }],
    ['adresse sans schéma', { label: 'OK', method: 'POST', endpoint: '//example.test/v1/x', success }],
    ['hors de /v1', { label: 'OK', method: 'POST', endpoint: '/admin/users', success }],
    ['chemin qui remonte', { label: 'OK', method: 'POST', endpoint: '/v1/../admin', success }],
    ['avec une requête', { label: 'OK', method: 'POST', endpoint: '/v1/x?y=1', success }],
    ['méthode inconnue', { label: 'OK', method: 'GET', endpoint: '/v1/x', success }],
    ['suite inconnue', { label: 'OK', method: 'POST', endpoint: '/v1/x', success: { action: 'open-url', message: 'x' } }],
    ['sans message', { label: 'OK', method: 'POST', endpoint: '/v1/x', success: { action: 'profile' } }],
  ])('refuse : %s', (_name, submit) => {
    expect(profileSubmission(submit as never)).toBeNull();
  });
});

describe('ProfileFormService.submit : méthode et point d’API de la définition', () => {
  const submission: ProfileSubmission = { method: 'PATCH', endpoint: '/v1/notifications', success: { action: 'profile', message: 'OK' } };

  it.each([
    ['un code demandé', { challenge: 'abc', channel: 'email', destination: 'j•••@example.com' }, 'challenge'],
    ['le compte modifié', { data: { id: 1, full_name: 'Jeanne' } }, 'user'],
    ['une réponse vide', undefined, 'none'],
    ['une autre réponse', { data: { enabled: true } }, 'none'],
  ])('%s', async (_name, response, kind) => {
    const client = { request: jest.fn().mockResolvedValue(response) };

    const result = await new ProfileFormService(client as unknown as ApiClient).submit(submission, { enabled: true });

    expect(result.kind).toBe(kind);
    expect(client.request).toHaveBeenCalledWith('/v1/notifications', { method: 'PATCH', body: { enabled: true } });
  });
});

describe('services du profil (une méthode par appel)', () => {
  it('ProfileMenuService.list : GET /v1/auth/me/menu, renvoie les liens', async () => {
    const items = [{ key: 'personal', label: 'Informations personnelles' }];
    const client = { get: jest.fn().mockResolvedValue({ data: items }) };

    await expect(new ProfileMenuService(client as unknown as ApiClient).list()).resolves.toBe(items);
    expect(client.get).toHaveBeenCalledWith('/v1/auth/me/menu');
  });
});
