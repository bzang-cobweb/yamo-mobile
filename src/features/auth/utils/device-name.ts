import * as Device from 'expo-device';

/**
 * Nom de l'appareil, qui nomme le jeton Sanctum côté serveur (ex. « iPhone de
 * Jeanne ») : l'app le renseigne elle-même, hors du formulaire de connexion.
 */
export function deviceName(): string {
  return Device.deviceName ?? Device.modelName ?? 'yamo-mobile';
}
