/**
 * Configuration lue au build depuis les variables `EXPO_PUBLIC_*` (`.env`).
 */

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL manquante : copier .env.example en .env et la renseigner.');
}

/** URL de base de l'API Laravel, sans barre finale (ex. http://yamo.ddev.site/api). */
export const API_URL = apiUrl.replace(/\/+$/, '');
