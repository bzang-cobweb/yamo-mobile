/**
 * Point d'API relatif (`/v1/auth/me/…`) qu'un serveur peut demander à l'app
 * d'appeler : jamais une autre adresse, ni un chemin qui remonte (`..`), ni une
 * requête (`?`).
 */
const API_PATH = /^\/v1(\/[A-Za-z0-9_-]+)+$/;

export function isApiPath(path: unknown): path is string {
  return typeof path === 'string' && API_PATH.test(path);
}
