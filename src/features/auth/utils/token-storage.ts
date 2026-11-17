import { readItem, removeItem, saveItem } from '@/shared/storage/device-storage';

/** Jeton Sanctum de l'appareil, dans le stockage chiffré du système. */
const KEY = 'yamo.auth.token';

export function readToken(): Promise<string | null> {
  return readItem(KEY);
}

export function saveToken(token: string): Promise<void> {
  return saveItem(KEY, token);
}

export function clearToken(): Promise<void> {
  return removeItem(KEY);
}
