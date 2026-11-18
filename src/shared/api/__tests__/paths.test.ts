import { isApiPath } from '../paths';

describe('isApiPath : point d’API qu’un serveur peut faire appeler', () => {
  it.each(['/v1/auth/me/addresses', '/v1/auth/me'])('accepte %s', (path) => {
    expect(isApiPath(path)).toBe(true);
  });

  it.each(['https://example.test/v1/x', '//example.test/v1/x', '/admin/users', '/v1/../admin', '/v1/x?y=1', '/v1', 12, null])('refuse %s', (path) => {
    expect(isApiPath(path)).toBe(false);
  });
});
