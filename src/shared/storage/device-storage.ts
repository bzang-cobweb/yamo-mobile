import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Petites valeurs gardées sur l'appareil. Sur iOS et Android, elles vivent dans
 * le stockage chiffré du système (Keychain / Keystore). Le web n'a pas
 * d'équivalent : `localStorage` n'y sert qu'au développement.
 */
export async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

export async function saveItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);

    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);

    return;
  }

  await SecureStore.deleteItemAsync(key);
}
