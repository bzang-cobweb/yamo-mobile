import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Jeton Sanctum de l'appareil. Sur iOS et Android, il vit dans le stockage
 * chiffré du système (Keychain / Keystore). Le web n'a pas d'équivalent :
 * `localStorage` n'y sert qu'au développement.
 */

const KEY = 'yamo.auth.token';

export async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  }

  return SecureStore.getItemAsync(KEY);
}

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(KEY, token);

    return;
  }

  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(KEY);

    return;
  }

  await SecureStore.deleteItemAsync(KEY);
}
