import { ApiClient } from '../ApiClient';
import { ApiError } from '../errors';

jest.mock('@/shared/config', () => ({ API_URL: 'http://api.test' }));

function respond(status: number, body: unknown) {
  return Promise.resolve({ status, ok: status < 400, statusText: '', json: () => Promise.resolve(body) } as Response);
}

describe('ApiClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('envoie un corps JSON avec son en-tête, le jeton et la langue', async () => {
    fetchMock.mockReturnValue(respond(200, { data: 1 }));
    const client = new ApiClient('http://api.test');
    client.setToken('abc');
    client.setLocale('fr');

    await client.patch('/v1/auth/me/preferences', { locale: 'en' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/v1/auth/me/preferences');
    expect(init.body).toBe('{"locale":"en"}');
    expect(init.headers).toEqual({
      Accept: 'application/json',
      'Accept-Language': 'fr',
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
  });

  it('envoie le pays courant (X-Country), et plus rien une fois retiré', async () => {
    fetchMock.mockReturnValue(respond(200, { data: 1 }));
    const client = new ApiClient('http://api.test');
    client.setCountry('CM');

    await client.get('/v1/lists/offer.mine');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Accept: 'application/json', 'X-Country': 'CM' });

    client.setCountry(null);
    await client.get('/v1/lists/offer.mine');
    expect(fetchMock.mock.calls[1][1].headers).toEqual({ Accept: 'application/json' });
  });

  it('envoie un FormData tel quel, sans forcer le Content-Type (multipart)', async () => {
    fetchMock.mockReturnValue(respond(200, { data: 1 }));
    const client = new ApiClient('http://api.test');
    const form = new FormData();
    form.append('avatar', 'x');

    await client.postForm('/v1/auth/me/avatar', form);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(init.headers).toHaveProperty('Accept', 'application/json');
  });

  it('envoie un DELETE et remonte les erreurs de validation', async () => {
    fetchMock.mockReturnValue(respond(422, { message: 'Invalide', errors: { avatar: ['Trop grande'] } }));
    const client = new ApiClient('http://api.test');

    const failure = client.delete('/v1/auth/me/avatar');

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 422, errors: { avatar: ['Trop grande'] } });
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });
});
