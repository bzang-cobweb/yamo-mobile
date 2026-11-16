/**
 * Textes de l'interface de l'app.
 *
 * Tous viennent de l'API (`GET /api/v1/messages`, fichiers `mobile.php` de
 * Laravel), sauf ceux de l'absence de réseau : sans réseau, l'API ne peut pas les
 * fournir (décision 2026-11-16-contrat-textes-servis-par-api).
 */

/** Langues que l'app sait choisir. Une langue proposée par l'API hors de cette liste n'est pas retenue. */
export const APP_LOCALES = ['fr', 'en'] as const;
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
} as const satisfies Record<Locale, Record<string, string>>;

export type OfflineKey = keyof (typeof OFFLINE_MESSAGES)['fr'];

/** Clés des textes servis par l'API, telles qu'on les utilise dans l'app. */
export type ApiMessageKey =
  | 'tabs.home'
  | 'tabs.profile'
  | 'home.greeting'
  | 'profile.title'
  | 'profile.personalInfo'
  | 'profile.password'
  | 'profile.preferences'
  | 'profile.saved'
  | 'profile.passwordSaved'
  | 'profile.signOut'
  | 'profile.back'
  | 'form.loading'
  | 'form.submitting'
  | 'form.selectPlaceholder'
  | 'form.showPassword'
  | 'form.hidePassword'
  | 'form.retry'
  | 'avatar.label'
  | 'avatar.change'
  | 'avatar.choose'
  | 'avatar.remove'
  | 'avatar.cancel'
  | 'avatar.uploading'
  | 'error.unknown';

export type MessageKey = ApiMessageKey | OfflineKey;

/** Textes reçus de l'API, par clé. */
export type Messages = Readonly<Record<string, string>>;
