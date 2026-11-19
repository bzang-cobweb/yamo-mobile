/**
 * Textes de l'interface de l'app.
 *
 * Tous viennent de l'API (`GET /api/v1/messages`, fichiers `mobile.php` de
 * Laravel), sauf ceux de l'absence de réseau : sans réseau, l'API ne peut pas les
 * fournir (décision 2026-11-16-contrat-textes-servis-par-api).
 */

/** Langues que l'app sait choisir. Une langue proposée par l'API hors de cette liste n'est pas retenue. */
// L'allemand (décision 2026-11-19-contrat-langue-saisie-allemand).
export const APP_LOCALES = ['fr', 'en', 'de'] as const;
export type Locale = (typeof APP_LOCALES)[number];

/** Langue par défaut si l'API est injoignable : celle de l'API (`config('app.default_locale')`). */
export const DEFAULT_LOCALE: Locale = 'fr';

/**
 * Les seuls textes écrits dans l'app : message et bouton de l'absence de réseau
 * (ou d'un serveur injoignable — dans les deux cas, l'API ne peut pas les fournir).
 */
export const OFFLINE_MESSAGES = {
  fr: {
    'offline.message': 'Connexion impossible. Vérifiez votre connexion internet, puis réessayez.',
    'offline.retry': 'Réessayer',
  },
  en: {
    'offline.message': "Can't connect. Check your internet connection, then try again.",
    'offline.retry': 'Try again',
  },
  de: {
    'offline.message': 'Keine Verbindung möglich. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    'offline.retry': 'Erneut versuchen',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/** Textes reçus de l'API, par clé. */
export type Messages = Readonly<Record<string, string>>;

/**
 * Variables d'un texte : chaque `:nom` du texte est remplacé par la valeur de
 * `nom` (`t('form.stepOf', { current: 1, total: 3 })`).
 */
export type TranslationParams = Readonly<Record<string, string | number>>;

/** Texte d'une clé, quelle qu'elle soit ; une clé inconnue s'affiche telle quelle. */
export type Translate = (key: string, params?: TranslationParams) => string;
