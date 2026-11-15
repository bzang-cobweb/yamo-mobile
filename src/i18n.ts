/**
 * Textes de l'app en français et en anglais — les langues de l'API
 * (`config('app.supported_locales')` côté Laravel).
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

const messages = {
  fr: {
    'signIn.title': 'Connexion',
    'signIn.email': 'Adresse e-mail',
    'signIn.password': 'Mot de passe',
    'signIn.submit': 'Se connecter',
    'signIn.submitting': 'Connexion…',
    'home.greeting': 'Bonjour {name}',
    'home.signedInAs': 'Connecté en tant que {fullName}',
    'home.email': 'E-mail : {email}',
    'home.signOut': 'Se déconnecter',
    'error.network': 'Le serveur est injoignable. Vérifiez votre connexion.',
    'error.unknown': 'Une erreur est survenue. Réessayez.',
  },
  en: {
    'signIn.title': 'Sign in',
    'signIn.email': 'Email address',
    'signIn.password': 'Password',
    'signIn.submit': 'Sign in',
    'signIn.submitting': 'Signing in…',
    'home.greeting': 'Hello {name}',
    'home.signedInAs': 'Signed in as {fullName}',
    'home.email': 'Email: {email}',
    'home.signOut': 'Sign out',
    'error.network': 'The server cannot be reached. Check your connection.',
    'error.unknown': 'Something went wrong. Please try again.',
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)['fr'];

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Langue de l'appareil si elle est proposée, sinon le français (langue par défaut de l'API). */
export function deviceLocale(): Locale {
  const language = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];

  return isLocale(language) ? language : 'fr';
}

export function translate(locale: Locale, key: MessageKey, params: Record<string, string> = {}): string {
  return messages[locale][key].replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match);
}
