import { readItem, saveItem } from '@/shared/storage/device-storage';

/**
 * Langue choisie sur l'écran d'accueil, avant d'avoir un compte. Elle prime sur
 * celles de l'appareil ; une fois connecté, la langue du compte prime.
 */
const KEY = 'yamo.locale';

export function readChosenLocale(): Promise<string | null> {
  return readItem(KEY);
}

export function saveChosenLocale(locale: string): Promise<void> {
  return saveItem(KEY, locale);
}
