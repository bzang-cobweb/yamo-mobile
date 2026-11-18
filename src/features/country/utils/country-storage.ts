import { readItem, saveItem } from '@/shared/storage/device-storage';

/**
 * Pays choisi à l'entrée, gardé sur l'appareil : au lancement suivant, on entre
 * directement dans ce pays s'il est toujours ouvert (décision 2026-11-18-espace-pays).
 */
const KEY = 'yamo.country';

export function readChosenCountry(): Promise<string | null> {
  return readItem(KEY);
}

export function saveChosenCountry(code: string): Promise<void> {
  return saveItem(KEY, code);
}
